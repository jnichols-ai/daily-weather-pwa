import { CITIES } from "@/lib/cities";
import { getWeatherForCity } from "@/lib/nws";
import { appendHistoryRow, upsertCurrentConditions, fetchCurrentItemsMap } from "@/lib/monday";

// Shared by the hourly cron route (GitHub Actions, auth-protected) and the
// on-demand refresh route (triggered by the "Refresh now" button in the UI).
// Pulls a fresh observation per city, computes heat index, writes both
// monday.com boards.
export async function runWeatherPull() {
  // Pre-fetch the current board's item map ONCE so each upsertCurrentConditions
  // call can look up the existing item ID without firing its own board scan.
  // This prevents the race condition that was causing duplicate city rows.
  const itemsMap = await fetchCurrentItemsMap();

  const results = await Promise.allSettled(
    CITIES.map(async (city) => {
      const reading = await getWeatherForCity(city);
      await Promise.all([appendHistoryRow(reading), upsertCurrentConditions(reading, itemsMap)]);
      return `${city.name}, ${city.state}`;
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failed = results
    .map((r, i) => (r.status === "rejected" ? { city: CITIES[i], error: String(r.reason) } : null))
    .filter(Boolean);

  return {
    ranAt: new Date().toISOString(),
    succeeded: succeeded.length,
    failed: failed.length,
    failures: failed,
  };
}
