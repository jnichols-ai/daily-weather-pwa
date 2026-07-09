import { NextResponse } from "next/server";
import { fetchHistory } from "@/lib/monday";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Supports ?city=Richmond&state=VA&date=2026-06-24&hour=19 client-side-style filtering
// on top of the monday history board. Paginates through ALL pages (500 rows each) so the
// full history is always visible. observedAt is stored as "YYYY-MM-DD HH:MM", so hour is
// matched against the HH portion (00-23, zero-padded). address is stored as "City, ST"
// (see lib/monday.js locationColumnValue), which city/state are matched against.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city")?.toLowerCase() || "";
    const state = searchParams.get("state")?.toLowerCase() || "";
    const date = searchParams.get("date") || "";
    const hour = searchParams.get("hour") || "";

    // Paginate through all monday pages (max 500 per call) until cursor is exhausted.
    // Guard at 100 pages (~50 000 rows) to avoid runaway in case of a bug.
    let allRows = [];
    let cursor = null;
    for (let page = 0; page < 100; page++) {
      const { rows, cursor: next } = await fetchHistory({ limit: 500, cursor });
      allRows = allRows.concat(rows);
      cursor = next;
      if (!cursor) break;
    }

    const filtered = allRows.filter((r) => {
      const observedAt = r.observedAt || "";
      const address = (r.address || "").toLowerCase();
      const [addrCity, addrState] = address.split(",").map((s) => s.trim());
      const matchesCity = city ? addrCity === city : true;
      const matchesState = state ? addrState === state : true;
      const matchesDate = date ? observedAt.startsWith(date) : true;
      const matchesHour = hour ? observedAt.slice(11, 13) === hour.padStart(2, "0") : true;
      return matchesCity && matchesState && matchesDate && matchesHour;
    });

    return NextResponse.json({ rows: filtered, total: allRows.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
