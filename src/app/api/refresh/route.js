import { NextResponse } from "next/server";
import { runWeatherPull } from "@/lib/weatherPull";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Triggered by the "Refresh now" button in the UI — runs the same pull as the
// hourly cron, but on demand. No CRON_SECRET here since the browser can't hold
// a server secret; this just re-runs the same NWS->monday write the hourly job
// does, so the worst case from misuse is a few extra history rows.
export async function POST() {
  const result = await runWeatherPull();
  return NextResponse.json(result);
}
