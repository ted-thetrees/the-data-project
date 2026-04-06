import { NextRequest, NextResponse } from "next/server";
import { generatePassphrase } from "@/lib/passphrase";
import { tidyText, detectContentType, cleanUrl } from "@/lib/content";
import { pool, BR, F } from "@/lib/db";

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
        `INSERT INTO ${BR.Passphrases} (${F.pass_passphrase}, ${F.pass_table_name}, ${F.pass_record_id}, "order", created_on, updated_on, trashed)
         VALUES ($1, $2, $3, 1, NOW(), NOW(), false)`,
        [passphrase, tableName, recordId]
      );

      // Tidy the content field if it's an Inbox record
      if (tableName === "Inbox") {
        try {
          const recordRes = await pool.query(
            `SELECT ${F.inbox_title} as content FROM ${BR.Inbox} WHERE ${F.inbox_teable_id} = $1 OR id::text = $1 LIMIT 1`,
            [recordId]
          );
          if (recordRes.rows.length > 0) {
            const content = recordRes.rows[0].content as string;
            if (content && detectContentType(content) === "text") {
              const tidied = tidyText(content);
              if (tidied !== content) {
                await pool.query(
                  `UPDATE ${BR.Inbox} SET ${F.inbox_title} = $1, updated_on = NOW()
                   WHERE ${F.inbox_teable_id} = $2 OR id::text = $2`,
                  [tidied, recordId]
                );
              }
            } else if (content) {
              const cleaned = cleanUrl(content);
              if (cleaned !== content) {
                await pool.query(
                  `UPDATE ${BR.Inbox} SET ${F.inbox_title} = $1, updated_on = NOW()
                   WHERE ${F.inbox_teable_id} = $2 OR id::text = $2`,
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
