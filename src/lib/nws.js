import { calcHeatIndex } from "./heatIndex";

const NWS_BASE = "https://api.weather.gov";

function userAgent() {
  // NWS requires a descriptive User-Agent identifying the app + contact per their API policy.
  return process.env.NWS_USER_AGENT || "daily-weather-pwa (unknown contact)";
}

async function nwsFetch(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent(),
      Accept: "application/geo+json",
    },
    // NWS data changes hourly; avoid any platform-level caching surprises.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`NWS request failed (${res.status}) for ${url}`);
  }
  return res.json();
}

// Resolves the nearest observation station id for a lat/lon. Cheap to call every run —
// no API key, no rate-limit concerns at our volume (~50 cities/hour).
export async function resolveStation(lat, lon) {
  const point = await nwsFetch(`${NWS_BASE}/points/${lat},${lon}`);
  const stationsUrl = point?.properties?.observationStations;
  if (!stationsUrl) throw new Error(`No observationStations link for ${lat},${lon}`);

  const stations = await nwsFetch(stationsUrl);
  const first = stations?.features?.[0];
  if (!first) throw new Error(`No observation stations found near ${lat},${lon}`);
  return first.properties.stationIdentifier;
}

function cToF(c) {
  if (c == null) return null;
  return Math.round((c * 9) / 5 + 32);
}

function msToMph(ms) {
  if (ms == null) return null;
  return Math.round(ms * 2.23694);
}

// Fetches the latest observation for a station and returns normalized fields.
export async function getLatestObservation(stationId) {
  const data = await nwsFetch(`${NWS_BASE}/stations/${stationId}/observations/latest`);
  const p = data?.properties;
  if (!p) throw new Error(`No observation properties for station ${stationId}`);

  const tempF = cToF(p.temperature?.value);
  const humidity = p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null;
  const windMph = msToMph(p.windSpeed?.value);
  const condition = p.textDescription || "Unknown";
  const observedAt = p.timestamp ? new Date(p.timestamp) : new Date();

  return {
    tempF,
    condition,
    windMph,
    heatIndexF: calcHeatIndex(tempF, humidity),
    observedAt,
  };
}

// Convenience: resolve station + fetch latest observation in one call.
export async function getWeatherForCity(city) {
  const stationId = await resolveStation(city.lat, city.lon);
  const obs = await getLatestObservation(stationId);
  return { city, stationId, ...obs };
}
