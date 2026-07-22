import { NextResponse } from "next/server";
import { poolTDPv4 } from "@/lib/db";

export async function GET() {
  const result = await poolTDPv4.query<{ name: string }>(
    `SELECT name FROM uber_projects ORDER BY name`,
  );
  return NextResponse.json({ names: result.rows.map((r) => r.name) });
}
