import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const runWeatherPull = vi.fn();
vi.mock("@/lib/weatherPull", () => ({ runWeatherPull: (...args) => runWeatherPull(...args) }));

const { GET } = await import("../route");

function request(headers = {}) {
  return new Request("http://localhost/api/cron/weather", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("GET /api/cron/weather", () => {
  it("rejects requests with a missing or wrong Authorization header when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "s3cret";

    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(runWeatherPull).not.toHaveBeenCalled();

    const wrongRes = await GET(request({ authorization: "Bearer wrong" }));
    expect(wrongRes.status).toBe(401);
    expect(runWeatherPull).not.toHaveBeenCalled();
  });

  it("runs the weather pull and returns its result when the secret matches", async () => {
    process.env.CRON_SECRET = "s3cret";
    runWeatherPull.mockResolvedValue({ ranAt: "2026-07-31T12:00:00.000Z", succeeded: 3, failed: 0, failures: [] });

    const res = await GET(request({ authorization: "Bearer s3cret" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(runWeatherPull).toHaveBeenCalledTimes(1);
    expect(body.succeeded).toBe(3);
  });

  it("allows unauthenticated requests through when CRON_SECRET is unset", async () => {
    // Documents the existing behavior: no secret configured means no auth check.
    runWeatherPull.mockResolvedValue({ ranAt: "now", succeeded: 1, failed: 0, failures: [] });

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(runWeatherPull).toHaveBeenCalledTimes(1);
  });
});
