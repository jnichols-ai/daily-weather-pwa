import { NextResponse } from "next/server";
import { fetchHistory } from "@/lib/monday";

export const dynamic = "force-dynamic";

// Supports ?city=Richmond&state=VA&date=2026-06-24&hour=19 client-side-style filtering
// on top of the monday history board. observedAt is stored as "YYYY-MM-DD HH:MM", so hour
// is matched against the HH portion (00-23, zero-padded). address is stored as "City, ST"
// (see lib/monday.js locationColumnValue), which city/state are matched against. Kept
// simple since volume is modest (hourly x ~50 cities).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city")?.toLowerCase() || "";
    const state = searchParams.get("state")?.toLowerCase() || "";
    const date = searchParams.get("date") || "";
    const hour = searchParams.get("hour") || "";

    const { rows } = await fetchHistory({ limit: 500 });

    const filtered = rows.filter((r) => {
      const observedAt = r.observedAt || "";
      const address = (r.address || "").toLowerCase();
      const [addrCity, addrState] = address.split(",").map((s) => s.trim());
      const matchesCity = city ? addrCity === city : true;
      const matchesState = state ? addrState === state : true;
      const matchesDate = date ? observedAt.startsWith(date) : true;
      const matchesHour = hour ? observedAt.slice(11, 13) === hour.padStart(2, "0") : true;
      return matchesCity && matchesState && matchesDate && matchesHour;
    });

    return NextResponse.json({ rows: filtered, total: rows.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
