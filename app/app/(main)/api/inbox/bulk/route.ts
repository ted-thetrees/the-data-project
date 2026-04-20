import { NextRequest, NextResponse } from "next/server";
import { poolV002 } from "@/lib/db";

export const maxDuration = 60;

interface Item {
  url: string;
  image?: string | null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const items: Item[] = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const client = await poolV002.connect();
  let inserted = 0;
  let skipped = 0;
  try {
    await client.query("BEGIN");
    for (const it of items) {
      if (!it?.url) {
        skipped++;
        continue;
      }
      const existing = await client.query(
        `SELECT 1 FROM inbox WHERE title = $1 LIMIT 1`,
        [it.url],
      );
      if (existing.rowCount && existing.rowCount > 0) {
        skipped++;
        continue;
      }
      await client.query(
        `INSERT INTO inbox (title, record_type, preview_image_url, preview_fetched_at)
         VALUES ($1, 'URL', $2, CASE WHEN $2 IS NULL THEN NULL ELSE now() END)`,
        [it.url, it.image ?? null],
      );
      inserted++;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  } finally {
    client.release();
  }

  return NextResponse.json({ inserted, skipped, total: items.length });
}
