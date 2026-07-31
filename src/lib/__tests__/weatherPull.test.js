import { describe, it, expect, vi, beforeEach } from "vitest";

const TEST_CITIES = [
  { name: "Dover", state: "DE", region: "Delaware", lat: 39.1582, lon: -75.5244 },
  { name: "Bowie", state: "MD", region: "Maryland", lat: 39.0068, lon: -76.7791 },
  { name: "Richmond", state: "VA", region: "VA I-95 Corridor", lat: 37.5407, lon: -77.436 },
];

vi.mock("@/lib/cities", () => ({ CITIES: TEST_CITIES }));

const getWeatherForCity = vi.fn();
const appendHistoryRow = vi.fn();
const upsertCurrentConditions = vi.fn();
const fetchCurrentItemsMap = vi.fn();

vi.mock("@/lib/nws", () => ({ getWeatherForCity: (...args) => getWeatherForCity(...args) }));
vi.mock("@/lib/monday", () => ({
  appendHistoryRow: (...args) => appendHistoryRow(...args),
  upsertCurrentConditions: (...args) => upsertCurrentConditions(...args),
  fetchCurrentItemsMap: (...args) => fetchCurrentItemsMap(...args),
}));

const { runWeatherPull } = await import("../weatherPull");

function reading(city) {
  return { city, tempF: 90, condition: "Clear", windMph: 5, heatIndexF: 90, observedAt: new Date() };
}

beforeEach(() => {
  vi.clearAllMocks();
  appendHistoryRow.mockResolvedValue({});
  upsertCurrentConditions.mockResolvedValue({});
});

describe("runWeatherPull", () => {
  it("pulls every city and reports success counts when nothing fails", async () => {
    fetchCurrentItemsMap.mockResolvedValue(new Map());
    getWeatherForCity.mockImplementation(async (city) => reading(city));

    const result = await runWeatherPull();

    expect(result.succeeded).toBe(TEST_CITIES.length);
    expect(result.failed).toBe(0);
    expect(result.failures).toEqual([]);
    expect(getWeatherForCity).toHaveBeenCalledTimes(TEST_CITIES.length);
    expect(appendHistoryRow).toHaveBeenCalledTimes(TEST_CITIES.length);
    expect(upsertCurrentConditions).toHaveBeenCalledTimes(TEST_CITIES.length);
  });

  it("continues processing the other cities when one city's fetch fails", async () => {
    fetchCurrentItemsMap.mockResolvedValue(new Map());
    getWeatherForCity.mockImplementation(async (city) => {
      if (city.name === "Bowie") throw new Error("NWS request failed (503)");
      return reading(city);
    });

    const result = await runWeatherPull();

    expect(result.succeeded).toBe(TEST_CITIES.length - 1);
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].city.name).toBe("Bowie");
    expect(result.failures[0].error).toContain("NWS request failed (503)");
    // The other two cities should still have been written despite Bowie's failure.
    expect(appendHistoryRow).toHaveBeenCalledTimes(TEST_CITIES.length - 1);
  });

  it("fetches the current-items map once and reuses it for every upsert call", async () => {
    const itemsMap = new Map([["Dover, DE", "42"]]);
    fetchCurrentItemsMap.mockResolvedValue(itemsMap);
    getWeatherForCity.mockImplementation(async (city) => reading(city));

    await runWeatherPull();

    expect(fetchCurrentItemsMap).toHaveBeenCalledTimes(1);
    for (const call of upsertCurrentConditions.mock.calls) {
      expect(call[1]).toBe(itemsMap);
    }
  });

  it("returns an ISO timestamp for ranAt", async () => {
    fetchCurrentItemsMap.mockResolvedValue(new Map());
    getWeatherForCity.mockImplementation(async (city) => reading(city));

    const result = await runWeatherPull();

    expect(() => new Date(result.ranAt).toISOString()).not.toThrow();
    expect(result.ranAt).toBe(new Date(result.ranAt).toISOString());
  });
});
