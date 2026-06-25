import { NextResponse } from "next/server";
import { runWeatherPull } from "@/lib/weatherPull";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GitHub Actions calls this hourly (see .github/workflows/hourly-weather.yml).
// Protected by CRON_SECRET so it can't be triggered by anyone who finds the URL.
export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWeatherPull();
  return NextResponse.json(result);
}
