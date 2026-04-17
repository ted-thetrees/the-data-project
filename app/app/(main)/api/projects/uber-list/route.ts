import { NextResponse } from "next/server";
import { poolV002 } from "@/lib/db";

export async function GET() {
  const result = await poolV002.query<{ name: string }>(
    `SELECT name FROM uber_projects ORDER BY name`,
  );
  return NextResponse.json({ names: result.rows.map((r) => r.name) });
}
