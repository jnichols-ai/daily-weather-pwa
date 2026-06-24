import { NextResponse } from "next/server";
import { fetchCurrentConditions } from "@/lib/monday";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await fetchCurrentConditions();
    return NextResponse.json({ rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
