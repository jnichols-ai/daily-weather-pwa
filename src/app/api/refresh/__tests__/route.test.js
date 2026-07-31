import { describe, it, expect, beforeEach, vi } from "vitest";

const runWeatherPull = vi.fn();
vi.mock("@/lib/weatherPull", () => ({ runWeatherPull: (...args) => runWeatherPull(...args) }));

const { POST } = await import("../route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/refresh", () => {
  it("runs the weather pull with no auth check and returns its result", async () => {
    runWeatherPull.mockResolvedValue({ ranAt: "2026-07-31T12:00:00.000Z", succeeded: 5, failed: 1, failures: [{ city: {}, error: "boom" }] });

    const res = await POST();
    const body = await res.json();

    expect(runWeatherPull).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(body).toEqual({ ranAt: "2026-07-31T12:00:00.000Z", succeeded: 5, failed: 1, failures: [{ city: {}, error: "boom" }] });
  });
});
