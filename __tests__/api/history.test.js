import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/weather/history/route.js';
import { fetchHistory } from '@/lib/monday.js';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      status: init?.status ?? 200,
      async json() {
        return data;
      },
    })),
  },
}));

vi.mock('@/lib/monday.js', () => ({
  fetchHistory: vi.fn(),
}));

// Representative fixture covering multiple cities, states, dates, and hours.
const FIXTURE_ROWS = [
  { id: '1', address: 'Richmond, VA',  observedAt: '2026-06-24 14:00', tempF: '85' },
  { id: '2', address: 'Baltimore, MD', observedAt: '2026-06-24 14:00', tempF: '78' },
  { id: '3', address: 'Nashville, TN', observedAt: '2026-06-25 09:00', tempF: '82' },
  { id: '4', address: 'Smyrna, DE',    observedAt: '2026-06-24 18:00', tempF: '76' },
  { id: '5', address: 'Smyrna, TN',    observedAt: '2026-06-24 18:00', tempF: '80' },
  { id: '6', address: null,            observedAt: null                             },
];

async function get(queryString = '') {
  const url = `http://localhost/api/weather/history${queryString ? '?' + queryString : ''}`;
  const res = await GET(new Request(url));
  return res.json();
}

describe('GET /api/weather/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchHistory.mockResolvedValue({ rows: FIXTURE_ROWS, cursor: null });
  });

  it('returns all rows and the total count when no filters are applied', async () => {
    const body = await get();
    expect(body.total).toBe(6);
    expect(body.rows).toHaveLength(6);
  });

  it('filters by city (case-insensitive match)', async () => {
    const body = await get('city=Richmond');
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].id).toBe('1');
  });

  it('filters by city case-insensitively', async () => {
    const body = await get('city=richmond');
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].id).toBe('1');
  });

  it('filters by state (case-insensitive match)', async () => {
    const body = await get('state=MD');
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].id).toBe('2');
  });

  it('filters by date prefix', async () => {
    const body = await get('date=2026-06-24');
    // rows 1 (14:00), 2 (14:00), 4 (18:00), 5 (18:00) — all on 2026-06-24
    expect(body.rows).toHaveLength(4);
    const ids = body.rows.map((r) => r.id);
    expect(ids).toContain('1');
    expect(ids).toContain('2');
    expect(ids).toContain('4');
    expect(ids).toContain('5');
  });

  it('filters by hour (two-digit)', async () => {
    const body = await get('hour=14');
    expect(body.rows).toHaveLength(2);
    const ids = body.rows.map((r) => r.id);
    expect(ids).toContain('1');
    expect(ids).toContain('2');
  });

  it('pads single-digit hour with a leading zero', async () => {
    // hour=9 should match the Nashville row whose observedAt starts with "...09:"
    const body = await get('hour=9');
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].id).toBe('3');
  });

  it('disambiguates same city name across different states', async () => {
    const bodyDE = await get('city=smyrna&state=de');
    expect(bodyDE.rows).toHaveLength(1);
    expect(bodyDE.rows[0].id).toBe('4');

    const bodyTN = await get('city=smyrna&state=tn');
    expect(bodyTN.rows).toHaveLength(1);
    expect(bodyTN.rows[0].id).toBe('5');
  });

  it('combines city, state, date, and hour filters', async () => {
    const body = await get('city=richmond&state=va&date=2026-06-24&hour=14');
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].id).toBe('1');
  });

  it('excludes rows with a null address when a city filter is active', async () => {
    const body = await get('city=richmond');
    expect(body.rows.every((r) => r.id !== '6')).toBe(true);
  });

  it('excludes rows with a null observedAt when a date filter is active', async () => {
    const body = await get('date=2026-06-24');
    expect(body.rows.every((r) => r.id !== '6')).toBe(true);
  });

  it('returns total reflecting the unfiltered row count', async () => {
    const body = await get('city=Richmond');
    expect(body.total).toBe(6); // total is always all rows from monday, not the filtered set
  });

  it('returns 500 when fetchHistory throws', async () => {
    fetchHistory.mockRejectedValue(new Error('monday API down'));
    const res = await GET(new Request('http://localhost/api/weather/history'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/monday API down/);
  });
});
