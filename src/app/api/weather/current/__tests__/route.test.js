import { describe, it, expect, beforeEach, vi } from "vitest";

const fetchCurrentConditions = vi.fn();
vi.mock("@/lib/monday", () => ({ fetchCurrentConditions: (...args) => fetchCurrentConditions(...args) }));

const { GET } = await import("../route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/weather/current", () => {
  it("returns the normalized rows from fetchCurrentConditions", async () => {
    const rows = [{ id: "1", name: "Dover, DE", tempF: "90" }];
    fetchCurrentConditions.mockResolvedValue(rows);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ rows });
  });

  it("returns a 500 with the error message when fetchCurrentConditions throws", async () => {
    fetchCurrentConditions.mockRejectedValue(new Error("monday API error"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("monday API error");
  });
});
