import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveStation, getLatestObservation, getWeatherForCity } from "../nws";
import { calcHeatIndex } from "../heatIndex";

function jsonResponse(data, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => data };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NWS_USER_AGENT;
});

describe("resolveStation", () => {
  it("resolves the nearest station identifier via points -> stations lookup", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ properties: { observationStations: "https://api.weather.gov/gridpoints/X/stations" } })
    );
    fetch.mockResolvedValueOnce(jsonResponse({ features: [{ properties: { stationIdentifier: "KDOV" } }] }));

    const stationId = await resolveStation(39.1582, -75.5244);

    expect(stationId).toBe("KDOV");
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.weather.gov/points/39.1582,-75.5244",
      expect.objectContaining({ cache: "no-store" })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://api.weather.gov/gridpoints/X/stations",
      expect.anything()
    );
  });

  it("sends the required NWS headers, defaulting the User-Agent when unset", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ properties: { observationStations: "url" } }));
    fetch.mockResolvedValueOnce(jsonResponse({ features: [{ properties: { stationIdentifier: "KDOV" } }] }));

    await resolveStation(1, 2);

    const headers = fetch.mock.calls[0][1].headers;
    expect(headers["User-Agent"]).toBe("daily-weather-pwa (unknown contact)");
    expect(headers.Accept).toBe("application/geo+json");
  });

  it("uses NWS_USER_AGENT from the environment when set", async () => {
    process.env.NWS_USER_AGENT = "daily-weather-pwa (test@example.com)";
    fetch.mockResolvedValueOnce(jsonResponse({ properties: { observationStations: "url" } }));
    fetch.mockResolvedValueOnce(jsonResponse({ features: [{ properties: { stationIdentifier: "KDOV" } }] }));

    await resolveStation(1, 2);

    expect(fetch.mock.calls[0][1].headers["User-Agent"]).toBe("daily-weather-pwa (test@example.com)");
  });

  it("throws when the points response has no observationStations link", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ properties: {} }));
    await expect(resolveStation(1, 2)).rejects.toThrow(/No observationStations link/);
  });

  it("throws when no observation stations are found near the point", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ properties: { observationStations: "url" } }));
    fetch.mockResolvedValueOnce(jsonResponse({ features: [] }));
    await expect(resolveStation(1, 2)).rejects.toThrow(/No observation stations found/);
  });

  it("throws a descriptive error when the NWS request itself fails", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 503 }));
    await expect(resolveStation(1, 2)).rejects.toThrow(/NWS request failed \(503\)/);
  });
});

describe("getLatestObservation", () => {
  it("normalizes C->F, m/s->mph, rounds humidity, and computes heat index", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        properties: {
          temperature: { value: 32.2 },
          relativeHumidity: { value: 50.4 },
          windSpeed: { value: 4.47 },
          textDescription: "Sunny",
          timestamp: "2026-07-31T14:00:00Z",
        },
      })
    );

    const obs = await getLatestObservation("KDOV");

    expect(obs.tempF).toBe(90);
    expect(obs.windMph).toBe(10);
    expect(obs.condition).toBe("Sunny");
    expect(obs.observedAt).toEqual(new Date("2026-07-31T14:00:00Z"));
    expect(obs.heatIndexF).toBe(calcHeatIndex(90, 50));
  });

  it("passes through null temperature/humidity/wind instead of NaN", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        properties: {
          temperature: { value: null },
          relativeHumidity: { value: null },
          windSpeed: { value: null },
        },
      })
    );

    const obs = await getLatestObservation("KDOV");

    expect(obs.tempF).toBeNull();
    expect(obs.windMph).toBeNull();
    expect(obs.heatIndexF).toBeNull();
  });

  it("falls back to 'Unknown' when textDescription is missing", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ properties: {} }));
    const obs = await getLatestObservation("KDOV");
    expect(obs.condition).toBe("Unknown");
  });

  it("defaults observedAt to now when the station omits a timestamp", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:00:00Z"));
    fetch.mockResolvedValueOnce(jsonResponse({ properties: {} }));

    const obs = await getLatestObservation("KDOV");

    expect(obs.observedAt).toEqual(new Date("2026-07-31T12:00:00Z"));
    vi.useRealTimers();
  });

  it("throws when the observation response has no properties", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({}));
    await expect(getLatestObservation("KDOV")).rejects.toThrow(/No observation properties/);
  });
});

describe("getWeatherForCity", () => {
  it("resolves a station then fetches its latest observation, tagging the result with city + stationId", async () => {
    const city = { name: "Dover", state: "DE", lat: 39.1582, lon: -75.5244 };

    fetch.mockResolvedValueOnce(jsonResponse({ properties: { observationStations: "stations-url" } }));
    fetch.mockResolvedValueOnce(jsonResponse({ features: [{ properties: { stationIdentifier: "KDOV" } }] }));
    fetch.mockResolvedValueOnce(
      jsonResponse({
        properties: {
          temperature: { value: 30 },
          relativeHumidity: { value: 40 },
          windSpeed: { value: 2 },
          textDescription: "Clear",
          timestamp: "2026-07-31T10:00:00Z",
        },
      })
    );

    const result = await getWeatherForCity(city);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.city).toBe(city);
    expect(result.stationId).toBe("KDOV");
    expect(result.condition).toBe("Clear");
    expect(typeof result.tempF).toBe("number");
  });
});
