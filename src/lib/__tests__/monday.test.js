import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  HISTORY_BOARD_ID,
  CURRENT_BOARD_ID,
  HISTORY_COLUMNS,
  CURRENT_COLUMNS,
  appendHistoryRow,
  fetchCurrentItemsMap,
  upsertCurrentConditions,
  fetchCurrentConditions,
  fetchHistory,
} from "../monday";

// Mirrors the real monday.com GraphQL response shape: { data: {...} } on success,
// { errors: [...] } on failure. mondayRequest() reads res.json().data / .errors.
function jsonResponse(data) {
  return { ok: true, status: 200, json: async () => ({ data }) };
}

function errorResponse(errors) {
  return { ok: true, status: 200, json: async () => ({ errors }) };
}

function callBody(call) {
  return JSON.parse(call[1].body);
}

const city = { name: "Dover", state: "DE", lat: 39.1582, lon: -75.5244 };

beforeEach(() => {
  process.env.MONDAY_API_TOKEN = "test-token";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  delete process.env.MONDAY_API_TOKEN;
  vi.unstubAllGlobals();
});

describe("mondayRequest error handling (via appendHistoryRow)", () => {
  const reading = {
    city,
    tempF: 91,
    condition: "Sunny",
    windMph: 5,
    heatIndexF: 95,
    observedAt: new Date("2026-07-31T14:23:00Z"),
  };

  it("throws when MONDAY_API_TOKEN is not set", async () => {
    delete process.env.MONDAY_API_TOKEN;
    await expect(appendHistoryRow(reading)).rejects.toThrow("MONDAY_API_TOKEN is not set");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when the API response contains GraphQL errors", async () => {
    fetch.mockResolvedValueOnce(errorResponse([{ message: "board not found" }]));
    await expect(appendHistoryRow(reading)).rejects.toThrow(/board not found/);
  });
});

describe("appendHistoryRow", () => {
  it("sends the history mutation with correctly built item name and column values", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ create_item: { id: "1" } }));

    const observedAt = new Date("2026-07-31T14:23:00Z");
    await appendHistoryRow({
      city,
      tempF: 91,
      condition: "Sunny",
      windMph: 5,
      heatIndexF: 95,
      observedAt,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = callBody(fetch.mock.calls[0]);
    expect(body.variables.boardId).toBe(HISTORY_BOARD_ID);
    expect(body.variables.itemName).toBe("Dover, DE — 2026-07-31 14:23");

    const columnValues = JSON.parse(body.variables.columnValues);
    expect(columnValues[HISTORY_COLUMNS.location]).toEqual({
      lat: "39.1582",
      lng: "-75.5244",
      address: "Dover, DE",
    });
    expect(columnValues[HISTORY_COLUMNS.temp]).toBe(91);
    expect(columnValues[HISTORY_COLUMNS.condition]).toBe("Sunny");
    expect(columnValues[HISTORY_COLUMNS.wind]).toBe(5);
    expect(columnValues[HISTORY_COLUMNS.heatIndex]).toBe(95);
    expect(columnValues[HISTORY_COLUMNS.observedAt]).toEqual({
      date: "2026-07-31",
      time: "14:23:00",
    });
  });
});

describe("fetchCurrentItemsMap", () => {
  it("keeps the highest numeric id when duplicate item names exist", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        boards: [
          {
            items_page: {
              items: [
                { id: "10", name: "Dover, DE" },
                { id: "20", name: "Dover, DE" },
                { id: "5", name: "Bowie, MD" },
              ],
            },
          },
        ],
      })
    );

    const map = await fetchCurrentItemsMap();
    expect(map.get("Dover, DE")).toBe("20");
    expect(map.get("Bowie, MD")).toBe("5");
  });

  it("returns an empty map instead of throwing when the request fails", async () => {
    fetch.mockRejectedValueOnce(new Error("network down"));
    const map = await fetchCurrentItemsMap();
    expect(map.size).toBe(0);
  });
});

describe("upsertCurrentConditions", () => {
  const reading = {
    city,
    tempF: 90,
    condition: "Clear",
    windMph: 3,
    heatIndexF: 90,
    observedAt: new Date("2026-07-31T10:00:00Z"),
  };

  it("updates the existing item when the pre-fetched map has a match", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ change_multiple_column_values: { id: "999" } }));
    const itemsMap = new Map([["Dover, DE", "999"]]);

    await upsertCurrentConditions(reading, itemsMap);

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = callBody(fetch.mock.calls[0]);
    expect(body.query).toContain("change_multiple_column_values");
    expect(body.variables.boardId).toBe(CURRENT_BOARD_ID);
    expect(body.variables.itemId).toBe("999");
    const columnValues = JSON.parse(body.variables.columnValues);
    expect(columnValues[CURRENT_COLUMNS.lastUpdated]).toEqual({
      date: "2026-07-31",
      time: "10:00:00",
    });
  });

  it("falls back to a live scan and updates the highest-id match when no map is provided", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        boards: [
          {
            items_page: {
              items: [
                { id: "50", name: "Dover, DE" },
                { id: "77", name: "Dover, DE" },
              ],
            },
          },
        ],
      })
    );
    fetch.mockResolvedValueOnce(jsonResponse({ change_multiple_column_values: { id: "77" } }));

    await upsertCurrentConditions(reading, undefined);

    expect(fetch).toHaveBeenCalledTimes(2);
    const updateBody = callBody(fetch.mock.calls[1]);
    expect(updateBody.query).toContain("change_multiple_column_values");
    expect(updateBody.variables.itemId).toBe("77");
  });

  it("creates a new item when the fallback scan itself fails", async () => {
    fetch.mockRejectedValueOnce(new Error("network down"));
    fetch.mockResolvedValueOnce(jsonResponse({ create_item: { id: "1" } }));

    await upsertCurrentConditions(reading, undefined);

    expect(fetch).toHaveBeenCalledTimes(2);
    const createBody = callBody(fetch.mock.calls[1]);
    expect(createBody.query).toContain("create_item");
  });

  it("creates a new item when the scan finds no existing match", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ boards: [{ items_page: { items: [] } }] })
    );
    fetch.mockResolvedValueOnce(jsonResponse({ create_item: { id: "1" } }));

    await upsertCurrentConditions(reading, new Map());

    expect(fetch).toHaveBeenCalledTimes(2);
    const createBody = callBody(fetch.mock.calls[1]);
    expect(createBody.query).toContain("create_item");
    expect(createBody.variables.itemName).toBe("Dover, DE");
  });
});

describe("fetchCurrentConditions", () => {
  function col(title, text, value) {
    return { id: title, text, value, column: { title } };
  }

  it("dedupes rows by name, keeping the highest item id, and normalizes fields", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        boards: [
          {
            items_page: {
              items: [
                {
                  id: "1",
                  name: "Dover, DE",
                  column_values: [
                    col("Location", "", JSON.stringify({ lat: "39.1", lng: "-75.5", address: "Dover, DE" })),
                    col("Temp (F)", "88", null),
                  ],
                },
                {
                  id: "2",
                  name: "Dover, DE",
                  column_values: [
                    col("Location", "", JSON.stringify({ lat: "39.1", lng: "-75.5", address: "Dover, DE" })),
                    col("Temp (F)", "90", null),
                  ],
                },
                {
                  id: "3",
                  name: "Bowie, MD",
                  column_values: [
                    col("Location", "", "not-valid-json{"),
                    col("Condition", "Cloudy", null),
                  ],
                },
              ],
            },
          },
        ],
      })
    );

    const rows = await fetchCurrentConditions();
    expect(rows).toHaveLength(2);

    const dover = rows.find((r) => r.name === "Dover, DE");
    expect(dover.id).toBe("2");
    expect(dover.tempF).toBe("90");
    expect(dover.lat).toBe(39.1);

    const bowie = rows.find((r) => r.name === "Bowie, MD");
    expect(bowie.lat).toBeNull();
    expect(bowie.lng).toBeNull();
    expect(bowie.tempF).toBeNull();
    expect(bowie.condition).toBe("Cloudy");
  });
});

describe("fetchHistory", () => {
  it("passes limit/cursor through and returns normalized rows plus the next cursor", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        boards: [
          {
            items_page: {
              cursor: "next-cursor",
              items: [
                {
                  id: "1",
                  name: "Dover, DE — 2026-07-31 10:00",
                  column_values: [
                    {
                      id: "loc",
                      text: "",
                      value: JSON.stringify({ lat: "39.1", lng: "-75.5", address: "Dover, DE" }),
                      column: { title: "Location" },
                    },
                    { id: "obs", text: "2026-07-31 10:00", value: null, column: { title: "Observed At" } },
                  ],
                },
              ],
            },
          },
        ],
      })
    );

    const { rows, cursor } = await fetchHistory({ limit: 500, cursor: "prev-cursor" });

    const body = callBody(fetch.mock.calls[0]);
    expect(body.variables).toEqual({ boardId: HISTORY_BOARD_ID, limit: 500, cursor: "prev-cursor" });

    expect(cursor).toBe("next-cursor");
    expect(rows).toHaveLength(1);
    expect(rows[0].address).toBe("Dover, DE");
    expect(rows[0].observedAt).toBe("2026-07-31 10:00");
  });
});
