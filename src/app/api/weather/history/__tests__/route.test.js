import { describe, it, expect, beforeEach, vi } from "vitest";

const fetchHistory = vi.fn();
vi.mock("@/lib/monday", () => ({ fetchHistory: (...args) => fetchHistory(...args) }));

const { GET } = await import("../route");

function request(query = "") {
  return new Request(`http://localhost/api/weather/history${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

const RICHMOND_TODAY = { id: "1", address: "Richmond, VA", observedAt: "2026-07-31 14:23" };
const BOWIE_TODAY = { id: "2", address: "Bowie, MD", observedAt: "2026-07-31 09:05" };
const RICHMOND_YESTERDAY = { id: "3", address: "Richmond, VA", observedAt: "2026-07-30 14:00" };

describe("GET /api/weather/history", () => {
  it("returns all rows and the unfiltered total when no query params are given", async () => {
    fetchHistory.mockResolvedValue({ rows: [RICHMOND_TODAY, BOWIE_TODAY, RICHMOND_YESTERDAY], cursor: null });

    const res = await GET(request());
    const body = await res.json();

    expect(body.total).toBe(3);
    expect(body.rows).toHaveLength(3);
  });

  it("filters by city, state, date, and hour together (case-insensitive, hour zero-padded)", async () => {
    fetchHistory.mockResolvedValue({ rows: [RICHMOND_TODAY, BOWIE_TODAY, RICHMOND_YESTERDAY], cursor: null });

    const res = await GET(request("?city=richmond&state=va&date=2026-07-31&hour=14"));
    const body = await res.json();

    expect(body.total).toBe(3);
    expect(body.rows).toEqual([RICHMOND_TODAY]);
  });

  it("zero-pads a single-digit hour filter", async () => {
    fetchHistory.mockResolvedValue({ rows: [RICHMOND_TODAY, BOWIE_TODAY, RICHMOND_YESTERDAY], cursor: null });

    const res = await GET(request("?hour=9"));
    const body = await res.json();

    expect(body.rows).toEqual([BOWIE_TODAY]);
  });

  it("paginates through every page until the cursor is exhausted", async () => {
    fetchHistory.mockResolvedValueOnce({ rows: [RICHMOND_TODAY], cursor: "page-2" });
    fetchHistory.mockResolvedValueOnce({ rows: [BOWIE_TODAY], cursor: null });

    const res = await GET(request());
    const body = await res.json();

    expect(fetchHistory).toHaveBeenCalledTimes(2);
    expect(fetchHistory).toHaveBeenNthCalledWith(1, { limit: 500, cursor: null });
    expect(fetchHistory).toHaveBeenNthCalledWith(2, { limit: 500, cursor: "page-2" });
    expect(body.total).toBe(2);
  });

  it("treats rows with a missing address/observedAt as unmatched under any filter, without throwing", async () => {
    const bareRow = { id: "4" };
    fetchHistory.mockResolvedValue({ rows: [bareRow], cursor: null });

    const res = await GET(request("?city=richmond"));
    const body = await res.json();

    expect(body.total).toBe(1);
    expect(body.rows).toEqual([]);
  });

  it("stops after 100 pages as a runaway guard", async () => {
    fetchHistory.mockResolvedValue({ rows: [], cursor: "always-more" });

    await GET(request());

    expect(fetchHistory).toHaveBeenCalledTimes(100);
  });

  it("returns a 500 with the error message when fetchHistory throws", async () => {
    fetchHistory.mockRejectedValue(new Error("monday API error"));

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("monday API error");
  });
});
