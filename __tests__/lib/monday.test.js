import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  appendHistoryRow,
  upsertCurrentConditions,
  fetchCurrentConditions,
  fetchHistory,
  HISTORY_BOARD_ID,
  CURRENT_BOARD_ID,
  HISTORY_COLUMNS,
  CURRENT_COLUMNS,
} from '@/lib/monday.js';

// --- helpers ---

function stubFetch(data) {
  const mock = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ data }),
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

function stubFetchError(errors) {
  const mock = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ errors }),
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

function stubFetchSequence(...responses) {
  const mock = vi.fn();
  for (const data of responses) {
    mock.mockResolvedValueOnce({
      json: () => Promise.resolve(data),
    });
  }
  vi.stubGlobal('fetch', mock);
  return mock;
}

function parseFetchBody(mock, callIndex = 0) {
  return JSON.parse(mock.mock.calls[callIndex][1].body);
}

// --- fixtures ---

const CITY = { name: 'Richmond', state: 'VA', lat: 37.5407, lon: -77.436 };
const OBSERVED_AT = new Date('2026-06-26T14:00:00.000Z');
const READING = {
  city: CITY,
  tempF: 85,
  condition: 'Sunny',
  windMph: 10,
  heatIndexF: 90,
  observedAt: OBSERVED_AT,
};

// location value as a JSON string (how monday.com returns it)
const LOC_VALUE = JSON.stringify({ lat: '37.5407', lng: '-77.436', address: 'Richmond, VA' });

function makeItem(id, name, columns) {
  return {
    id,
    name,
    column_values: columns.map(([title, text, value]) => ({
      id: `c_${id}_${title}`,
      text,
      value,
      column: { title },
    })),
  };
}

const FULL_CURRENT_ITEM = makeItem('123', 'Richmond, VA', [
  ['Location',          null,               LOC_VALUE],
  ['Temp (F)',          '85',               '85'],
  ['Condition',         'Sunny',            '"Sunny"'],
  ['Wind Speed (mph)',  '10',               '10'],
  ['Heat Index (F)',    '90',               '90'],
  ['Last Updated',      '2026-06-26 14:00', '"2026-06-26 14:00"'],
]);

const FULL_HISTORY_ITEM = makeItem('456', 'Richmond, VA — 2026-06-26 14:00', [
  ['Location',          null,               LOC_VALUE],
  ['Temp (F)',          '85',               '85'],
  ['Condition',         'Sunny',            '"Sunny"'],
  ['Wind Speed (mph)',  '10',               '10'],
  ['Heat Index (F)',    '90',               '90'],
  ['Observed At',       '2026-06-26 14:00', '"2026-06-26 14:00"'],
]);

// --- tests ---

describe('monday.js', () => {
  beforeEach(() => {
    process.env.MONDAY_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.MONDAY_API_TOKEN;
    vi.unstubAllGlobals();
  });

  // ─── mondayRequest (tested indirectly) ─────────────────────────────────────

  describe('mondayRequest error handling', () => {
    it('throws when MONDAY_API_TOKEN is not configured', async () => {
      delete process.env.MONDAY_API_TOKEN;
      await expect(fetchCurrentConditions()).rejects.toThrow('MONDAY_API_TOKEN is not set');
    });

    it('throws when the API response contains errors', async () => {
      stubFetchError([{ message: 'Invalid token' }]);
      await expect(fetchCurrentConditions()).rejects.toThrow('monday API error');
    });

    it('sends the Authorization header and correct API version', async () => {
      const mock = stubFetch({ boards: [{ items_page: { items: [] } }] });
      await fetchCurrentConditions();
      const headers = mock.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('test-token');
      expect(headers['API-Version']).toBe('2024-10');
    });
  });

  // ─── appendHistoryRow ──────────────────────────────────────────────────────

  describe('appendHistoryRow', () => {
    it('sends a create_item mutation to the history board', async () => {
      const mock = stubFetch({ create_item: { id: '789' } });
      await appendHistoryRow(READING);
      const body = parseFetchBody(mock);
      expect(body.query).toContain('create_item');
      expect(body.variables.boardId).toBe(HISTORY_BOARD_ID);
    });

    it('formats item name as "City, STATE — YYYY-MM-DD HH:MM" (em dash)', async () => {
      const mock = stubFetch({ create_item: { id: '789' } });
      await appendHistoryRow(READING);
      const { itemName } = parseFetchBody(mock).variables;
      expect(itemName).toBe('Richmond, VA — 2026-06-26 14:00');
    });

    it('includes location column with lat, lng, and address strings', async () => {
      const mock = stubFetch({ create_item: { id: '789' } });
      await appendHistoryRow(READING);
      const colVals = JSON.parse(parseFetchBody(mock).variables.columnValues);
      expect(colVals[HISTORY_COLUMNS.location]).toEqual({
        lat: '37.5407',
        lng: '-77.436',
        address: 'Richmond, VA',
      });
    });

    it('includes date column with ISO date and time split into separate fields', async () => {
      const mock = stubFetch({ create_item: { id: '789' } });
      await appendHistoryRow(READING);
      const colVals = JSON.parse(parseFetchBody(mock).variables.columnValues);
      expect(colVals[HISTORY_COLUMNS.observedAt]).toEqual({
        date: '2026-06-26',
        time: '14:00:00',
      });
    });

    it('includes temperature, condition, wind, and heat index in column values', async () => {
      const mock = stubFetch({ create_item: { id: '789' } });
      await appendHistoryRow(READING);
      const colVals = JSON.parse(parseFetchBody(mock).variables.columnValues);
      expect(colVals[HISTORY_COLUMNS.temp]).toBe(85);
      expect(colVals[HISTORY_COLUMNS.condition]).toBe('Sunny');
      expect(colVals[HISTORY_COLUMNS.wind]).toBe(10);
      expect(colVals[HISTORY_COLUMNS.heatIndex]).toBe(90);
    });
  });

  // ─── upsertCurrentConditions ───────────────────────────────────────────────

  describe('upsertCurrentConditions', () => {
    it('calls change_multiple_column_values when an existing item is found', async () => {
      const mock = stubFetchSequence(
        // findCurrentItemId — returns a match
        { data: { boards: [{ items_page: { items: [{ id: '999', name: 'Richmond, VA' }] } }] } },
        // update mutation
        { data: { change_multiple_column_values: { id: '999' } } },
      );

      await upsertCurrentConditions(READING);

      expect(mock).toHaveBeenCalledTimes(2);
      const updateBody = parseFetchBody(mock, 1);
      expect(updateBody.query).toContain('change_multiple_column_values');
      expect(updateBody.variables.itemId).toBe('999');
      expect(updateBody.variables.boardId).toBe(CURRENT_BOARD_ID);
    });

    it('calls create_item when no existing item is found', async () => {
      const mock = stubFetchSequence(
        { data: { boards: [{ items_page: { items: [] } }] } },
        { data: { create_item: { id: '888' } } },
      );

      await upsertCurrentConditions(READING);

      expect(mock).toHaveBeenCalledTimes(2);
      const createBody = parseFetchBody(mock, 1);
      expect(createBody.query).toContain('create_item');
      expect(createBody.variables.itemName).toBe('Richmond, VA');
      expect(createBody.variables.boardId).toBe(CURRENT_BOARD_ID);
    });

    it('falls back to create_item when findCurrentItemId throws (API error)', async () => {
      // First call errors → mondayRequest throws → findCurrentItemId catch → null
      const mock = stubFetchSequence(
        { errors: [{ message: 'filter not supported' }] },
        { data: { create_item: { id: '777' } } },
      );

      await upsertCurrentConditions(READING);

      expect(mock).toHaveBeenCalledTimes(2);
      const createBody = parseFetchBody(mock, 1);
      expect(createBody.query).toContain('create_item');
    });

    it('uses the lastUpdated column key (not observedAt) for the date field', async () => {
      const mock = stubFetchSequence(
        { data: { boards: [{ items_page: { items: [] } }] } },
        { data: { create_item: { id: '888' } } },
      );

      await upsertCurrentConditions(READING);

      const colVals = JSON.parse(parseFetchBody(mock, 1).variables.columnValues);
      // CURRENT_COLUMNS has no observedAt — buildColumnValues falls back to lastUpdated
      expect(colVals[CURRENT_COLUMNS.lastUpdated]).toEqual({
        date: '2026-06-26',
        time: '14:00:00',
      });
      // Sanity-check: the history key should NOT appear in current column values
      expect(colVals[HISTORY_COLUMNS.observedAt]).toBeUndefined();
    });
  });

  // ─── fetchCurrentConditions ────────────────────────────────────────────────

  describe('fetchCurrentConditions', () => {
    it('returns fully normalized items from the current board', async () => {
      stubFetch({ boards: [{ items_page: { items: [FULL_CURRENT_ITEM] } }] });

      const result = await fetchCurrentConditions();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '123',
        name: 'Richmond, VA',
        lat: 37.5407,
        lng: -77.436,
        tempF: '85',
        condition: 'Sunny',
        windMph: '10',
        heatIndexF: '90',
        lastUpdated: '2026-06-26 14:00',
      });
    });

    it('returns an empty array when the board has no items', async () => {
      stubFetch({ boards: [{ items_page: { items: [] } }] });
      expect(await fetchCurrentConditions()).toEqual([]);
    });

    it('returns an empty array when the boards response is empty', async () => {
      stubFetch({ boards: [] });
      expect(await fetchCurrentConditions()).toEqual([]);
    });

    it('returns null lat/lng when the Location column is absent', async () => {
      const item = makeItem('200', 'Test, VA', [['Temp (F)', '72', '72']]);
      stubFetch({ boards: [{ items_page: { items: [item] } }] });

      const [row] = await fetchCurrentConditions();
      expect(row.lat).toBeNull();
      expect(row.lng).toBeNull();
    });

    it('returns null lat/lng when the location value is malformed JSON', async () => {
      const item = makeItem('201', 'Test, VA', [
        ['Location', null, 'not { valid json'],
      ]);
      stubFetch({ boards: [{ items_page: { items: [item] } }] });

      const [row] = await fetchCurrentConditions();
      expect(row.lat).toBeNull();
      expect(row.lng).toBeNull();
    });

    it('parses location when value is a pre-parsed object (not a JSON string)', async () => {
      const item = makeItem('202', 'Richmond, VA', [
        ['Location', null, { lat: '37.5407', lng: '-77.436', address: 'Richmond, VA' }],
      ]);
      stubFetch({ boards: [{ items_page: { items: [item] } }] });

      const [row] = await fetchCurrentConditions();
      expect(row.lat).toBe(37.5407);
      expect(row.lng).toBe(-77.436);
    });

    it('returns parsed lat/lng as JavaScript numbers', async () => {
      stubFetch({ boards: [{ items_page: { items: [FULL_CURRENT_ITEM] } }] });
      const [row] = await fetchCurrentConditions();
      expect(typeof row.lat).toBe('number');
      expect(typeof row.lng).toBe('number');
    });

    it('returns null for every text field when columns are missing', async () => {
      const item = makeItem('203', 'Sparse, VA', [['Location', null, LOC_VALUE]]);
      stubFetch({ boards: [{ items_page: { items: [item] } }] });

      const [row] = await fetchCurrentConditions();
      expect(row.tempF).toBeNull();
      expect(row.condition).toBeNull();
      expect(row.windMph).toBeNull();
      expect(row.heatIndexF).toBeNull();
      expect(row.lastUpdated).toBeNull();
    });
  });

  // ─── fetchHistory ──────────────────────────────────────────────────────────

  describe('fetchHistory', () => {
    it('returns fully normalized rows from the history board', async () => {
      stubFetch({ boards: [{ items_page: { cursor: null, items: [FULL_HISTORY_ITEM] } }] });

      const { rows, cursor } = await fetchHistory();

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        id: '456',
        name: 'Richmond, VA — 2026-06-26 14:00',
        address: 'Richmond, VA',
        tempF: '85',
        condition: 'Sunny',
        windMph: '10',
        heatIndexF: '90',
        observedAt: '2026-06-26 14:00',
      });
      expect(cursor).toBeNull();
    });

    it('returns the pagination cursor from the response', async () => {
      stubFetch({ boards: [{ items_page: { cursor: 'next_page_token', items: [] } }] });
      const { cursor } = await fetchHistory();
      expect(cursor).toBe('next_page_token');
    });

    it('passes limit and cursor as GraphQL variables', async () => {
      const mock = stubFetch({ boards: [{ items_page: { cursor: null, items: [] } }] });
      await fetchHistory({ limit: 100, cursor: 'page2' });
      const { variables } = parseFetchBody(mock);
      expect(variables.limit).toBe(100);
      expect(variables.cursor).toBe('page2');
    });

    it('defaults to limit 1000 and null cursor', async () => {
      const mock = stubFetch({ boards: [{ items_page: { cursor: null, items: [] } }] });
      await fetchHistory();
      const { variables } = parseFetchBody(mock);
      expect(variables.limit).toBe(1000);
      expect(variables.cursor).toBeNull();
    });

    it('returns null address when the Location column is missing', async () => {
      const item = makeItem('300', 'Sparse', [['Observed At', '2026-06-26 14:00', '...']]);
      stubFetch({ boards: [{ items_page: { cursor: null, items: [item] } }] });
      const { rows } = await fetchHistory();
      expect(rows[0].address).toBeNull();
    });

    it('returns empty rows and null cursor when the board has no items', async () => {
      stubFetch({ boards: [{ items_page: { cursor: null, items: [] } }] });
      const { rows, cursor } = await fetchHistory();
      expect(rows).toEqual([]);
      expect(cursor).toBeNull();
    });
  });
});
