import { NextRequest, NextResponse } from "next/server";
import { generatePassphrase } from "@/lib/passphrase";
import { tidyText, detectContentType, cleanUrl } from "@/lib/content";
import { pool } from "@/lib/db";

const MAX_RETRIES = 5;

export async function POST(req: NextRequest) {
  const { recordId, tableName = "Inbox" } = await req.json();

  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const passphrase = await generatePassphrase();

    try {
      // Insert passphrase directly via SQL
      await pool.query(
        `INSERT INTO passphrases (passphrase, table_name, record_id)
         VALUES ($1, $2, $3)`,
        [passphrase, tableName, recordId]
      );

      // Tidy the content field if it's an Inbox record
      if (tableName === "Inbox") {
        try {
          const recordRes = await pool.query(
            `SELECT title as content FROM inbox WHERE id::text = $1 LIMIT 1`,
            [recordId]
          );
          if (recordRes.rows.length > 0) {
            const content = recordRes.rows[0].content as string;
            if (content && detectContentType(content) === "text") {
              const tidied = tidyText(content);
              if (tidied !== content) {
                await pool.query(
                  `UPDATE inbox SET title = $1 WHERE id::text = $2`,
                  [tidied, recordId]
                );
              }
            } else if (content) {
              const cleaned = cleanUrl(content);
              if (cleaned !== content) {
                await pool.query(
                  `UPDATE inbox SET title = $1 WHERE id::text = $2`,
                  [cleaned, recordId]
                );
              }
            }
          }
        } catch {
          // Non-fatal — passphrase was still assigned
        }
      }

      return NextResponse.json({ success: true, passphrase, recordId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        continue; // retry with a new passphrase
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Failed to generate unique passphrase after retries" }, { status: 500 });
}
