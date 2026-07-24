// Thin client for the monday.com GraphQL API. Two boards are used:
//  - HISTORY board: append-only, one item per city per hourly run (search/filter by date+location)
//  - CURRENT board: one item per city, overwritten in place each run (feeds the map)
//
// Column IDs below match the boards created for this project in the Service workspace.
// If you recreate the boards, update these (or the matching env vars).

const MONDAY_API_URL = "https://api.monday.com/v2";

export const HISTORY_BOARD_ID = process.env.MONDAY_HISTORY_BOARD_ID || "18419232698";
export const CURRENT_BOARD_ID = process.env.MONDAY_CURRENT_BOARD_ID || "18419232702";

export const HISTORY_COLUMNS = {
  location: "location_mm4mz83n",
  temp: "numeric_mm4mp47r",
  condition: "text_mm4m42mg",
  wind: "numeric_mm4mvckr",
  heatIndex: "numeric_mm4m87ew",
  observedAt: "date_mm4mwkfm",
};

export const CURRENT_COLUMNS = {
  location: "location_mm4mj7gy",
  temp: "numeric_mm4m4se2",
  condition: "text_mm4mcp0c",
  wind: "numeric_mm4msp54",
  heatIndex: "numeric_mm4m774w",
  lastUpdated: "date_mm4mpyvv",
};

async function mondayRequest(query, variables) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("MONDAY_API_TOKEN is not set");

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(`monday API error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

function dateColumnValue(date) {
  const iso = date.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 19),
  };
}

function locationColumnValue(city) {
  return {
    lat: String(city.lat),
    lng: String(city.lon),
    address: `${city.name}, ${city.state}`,
  };
}

function buildColumnValues(columns, { city, tempF, condition, windMph, heatIndexF, observedAt }) {
  return {
    [columns.location]: locationColumnValue(city),
    [columns.temp]: tempF,
    [columns.condition]: condition,
    [columns.wind]: windMph,
    [columns.heatIndex]: heatIndexF,
    [columns.observedAt || columns.lastUpdated]: dateColumnValue(observedAt),
  };
}

// Always creates a new item — this is the append-only history log.
export async function appendHistoryRow(reading) {
  const { city, observedAt } = reading;
  const itemName = `${city.name}, ${city.state} — ${observedAt.toISOString().slice(0, 16).replace("T", " ")}`;
  const columnValues = buildColumnValues(HISTORY_COLUMNS, reading);

  const mutation = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }
  `;
  return mondayRequest(mutation, {
    boardId: HISTORY_BOARD_ID,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });
}

// Fetches all items on the CURRENT board and returns a Map of
// itemName → highest-id (most recently created) item ID.
// Call this ONCE per hourly run and pass the result to every
// upsertCurrentConditions call — avoids 57 parallel board scans.
export async function fetchCurrentItemsMap() {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 500) { items { id name } }
      }
    }
  `;
  try {
    const data = await mondayRequest(query, { boardId: CURRENT_BOARD_ID });
    const items = data?.boards?.[0]?.items_page?.items || [];
    const map = new Map();
    for (const item of items) {
      // If duplicates exist, keep the most recently created (highest numeric ID).
      const existing = map.get(item.name);
      if (!existing || Number(item.id) > Number(existing)) {
        map.set(item.name, item.id);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

// Creates the city's row on first run, otherwise updates it in place.
// Pass the itemsMap returned by fetchCurrentItemsMap() to avoid a redundant
// per-city board scan. Falls back to a direct scan if no map is provided.
export async function upsertCurrentConditions(reading, itemsMap) {
  const { city } = reading;
  const itemName = `${city.name}, ${city.state}`;
  const columnValues = buildColumnValues(CURRENT_COLUMNS, reading);

  // Use the pre-fetched map when available; otherwise do a single-city scan.
  let existingId = itemsMap?.get(itemName) ?? null;
  if (existingId == null) {
    try {
      const scanQuery = `
        query ($boardId: ID!) {
          boards(ids: [$boardId]) {
            items_page(limit: 500) { items { id name } }
          }
        }
      `;
      const data = await mondayRequest(scanQuery, { boardId: CURRENT_BOARD_ID });
      const items = data?.boards?.[0]?.items_page?.items || [];
      const matches = items
        .filter((i) => i.name === itemName)
        .sort((a, b) => Number(b.id) - Number(a.id));
      existingId = matches[0]?.id || null;
    } catch {
      existingId = null;
    }
  }

  if (existingId) {
    const mutation = `
      mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
          id
        }
      }
    `;
    return mondayRequest(mutation, {
      boardId: CURRENT_BOARD_ID,
      itemId: existingId,
      columnValues: JSON.stringify(columnValues),
    });
  }

  const mutation = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }
  `;
  return mondayRequest(mutation, {
    boardId: CURRENT_BOARD_ID,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });
}

function parseLocationValue(col) {
  if (!col) return null;
  try {
    const v = typeof col.value === "string" ? JSON.parse(col.value) : col.value;
    return v ? { lat: parseFloat(v.lat), lng: parseFloat(v.lng), address: v.address } : null;
  } catch {
    return null;
  }
}

function colByTitle(item, title) {
  return item.column_values.find((c) => c.column.title === title);
}

// Reads every row currently on the CURRENT board, normalized for the frontend/map.
export async function fetchCurrentConditions() {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              value
              column { title }
            }
          }
        }
      }
    }
  `;
  const data = await mondayRequest(query, { boardId: CURRENT_BOARD_ID });
  const items = data?.boards?.[0]?.items_page?.items || [];

  const rows = items.map((item) => {
    const loc = parseLocationValue(colByTitle(item, "Location"));
    return {
      id: item.id,
      name: item.name,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      tempF: colByTitle(item, "Temp (F)")?.text || null,
      condition: colByTitle(item, "Condition")?.text || null,
      windMph: colByTitle(item, "Wind Speed (mph)")?.text || null,
      heatIndexF: colByTitle(item, "Heat Index (F)")?.text || null,
      lastUpdated: colByTitle(item, "Last Updated")?.text || null,
    };
  });

  // Deduplicate: if the upsert ever created extra copies of a city, keep only
  // the most recently created one (highest numeric item ID) per city name.
  const byName = new Map();
  for (const row of rows) {
    const existing = byName.get(row.name);
    if (!existing || Number(row.id) > Number(existing.id)) {
      byName.set(row.name, row);
    }
  }
  return Array.from(byName.values());
}

// Reads the history board, optionally paginated. Filtering by date/location is done
// client-side in the API route since item counts here stay modest (hourly x ~50 cities).
export async function fetchHistory({ limit = 1000, cursor = null } = {}) {
  const query = `
    query ($boardId: ID!, $limit: Int!, $cursor: String) {
      boards(ids: [$boardId]) {
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values {
              id
              text
              value
              column { title }
            }
          }
        }
      }
    }
  `;
  const data = await mondayRequest(query, { boardId: HISTORY_BOARD_ID, limit, cursor });
  const page = data?.boards?.[0]?.items_page;
  const items = page?.items || [];

  const rows = items.map((item) => {
    const loc = parseLocationValue(colByTitle(item, "Location"));
    return {
      id: item.id,
      name: item.name,
      address: loc?.address || null,
      tempF: colByTitle(item, "Temp (F)")?.text || null,
      condition: colByTitle(item, "Condition")?.text || null,
      windMph: colByTitle(item, "Wind Speed (mph)")?.text || null,
      heatIndexF: colByTitle(item, "Heat Index (F)")?.text || null,
      observedAt: colByTitle(item, "Observed At")?.text || null,
    };
  });

  return { rows, cursor: page?.cursor || null };
}
