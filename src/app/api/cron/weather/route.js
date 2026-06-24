import { NextResponse } from "next/server";
import { CITIES } from "@/lib/cities";
import { getWeatherForCity } from "@/lib/nws";
import { appendHistoryRow, upsertCurrentConditions } from "@/lib/monday";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron calls this hourly (see vercel.json). Protected by CRON_SECRET so it
// can't be triggered by anyone who finds the URL.
export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await Promise.allSettled(
    CITIES.map(async (city) => {
      const reading = await getWeatherForCity(city);
      await Promise.all([appendHistoryRow(reading), upsertCurrentConditions(reading)]);
      return `${city.name}, ${city.state}`;
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failed = results
    .map((r, i) => (r.status === "rejected" ? { city: CITIES[i], error: String(r.reason) } : null))
    .filter(Boolean);

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    succeeded: succeeded.length,
    failed: failed.length,
    failures: failed,
  });
}
