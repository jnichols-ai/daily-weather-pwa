import { NextResponse } from "next/server";
import { fetchHistory } from "@/lib/monday";

export const dynamic = "force-dynamic";

// Supports ?location=Richmond&date=2026-06-24 client-side-style filtering on top of
// the monday history board. Kept simple since volume is modest (hourly x ~50 cities).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location")?.toLowerCase() || "";
    const date = searchParams.get("date") || "";

    const { rows } = await fetchHistory({ limit: 1000 });

    const filtered = rows.filter((r) => {
      const matchesLocation = location
        ? r.name.toLowerCase().includes(location) || (r.address || "").toLowerCase().includes(location)
        : true;
      const matchesDate = date ? (r.observedAt || "").startsWith(date) : true;
      return matchesLocation && matchesDate;
    });

    return NextResponse.json({ rows: filtered, total: rows.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
