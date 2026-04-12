import { NextRequest, NextResponse } from "next/server";
import { poolV002 } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: { name?: unknown; colors?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid json" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const colorsInput = Array.isArray(body.colors) ? body.colors : null;

  if (!name) {
    return NextResponse.json(
      { error: "name required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  if (!colorsInput || colorsInput.length === 0) {
    return NextResponse.json(
      { error: "colors required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const hexRe = /^#[0-9a-fA-F]{6}$/;
  const colors: (string | null)[] = [];
  for (const c of colorsInput) {
    if (typeof c !== "string") continue;
    const trimmed = c.trim();
    if (hexRe.test(trimmed)) colors.push(trimmed.toLowerCase());
    if (colors.length >= 15) break;
  }
  while (colors.length < 15) colors.push(null);

  const cols = Array.from({ length: 15 }, (_, i) => `color_${i + 1}`);
  const placeholders = cols.map((_, i) => `$${i + 2}`).join(", ");
  const result = await poolV002.query(
    `INSERT INTO color_palettes (name, ${cols.join(", ")})
     VALUES ($1, ${placeholders})
     RETURNING id::text, name`,
    [name, ...colors]
  );

  return NextResponse.json(
    { success: true, id: result.rows[0].id, name: result.rows[0].name },
    { headers: CORS_HEADERS }
  );
}
