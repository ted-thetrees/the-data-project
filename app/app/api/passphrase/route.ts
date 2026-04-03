import { NextRequest, NextResponse } from "next/server";
import { generatePassphrase } from "@/lib/passphrase";
import { tidyText, detectContentType, cleanUrl } from "@/lib/content";

const TEABLE_KEY = process.env.TEABLE_API_KEY!;
const TEABLE_URL = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
const INBOX_TABLE_ID = "tblxWdmSHnBdDYjcmKX";
const CONTENT_FIELD = "fldAfD5hZNUos5KGlC5";
const PASSPHRASES_TABLE_ID = "tblBYrVi2x3KeZOIzYZ";
const INBOX_LINK_FIELD = "fldyn9V5K1K4GAMwWCJ";
const PASSPHRASE_FIELD = "fldzWslh4WONRZPw5a8";
const TABLE_NAME_FIELD = "fldpC2TL3V97XLRbCqC";
const RECORD_ID_FIELD = "fldoyaQH4SLKZXMcVZY";

const MAX_RETRIES = 5;

export async function POST(req: NextRequest) {
  const { recordId, tableName = "Inbox" } = await req.json();

  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const passphrase = await generatePassphrase();

    const res = await fetch(`${TEABLE_URL}/api/table/${PASSPHRASES_TABLE_ID}/record`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fieldKeyType: "id",
        records: [
          {
            fields: {
              [PASSPHRASE_FIELD]: passphrase,
              [TABLE_NAME_FIELD]: tableName,
              [RECORD_ID_FIELD]: recordId,
              [INBOX_LINK_FIELD]: [{ id: recordId }],
            },
          },
        ],
      }),
    });

    if (res.ok) {
      // Tidy the content field if it's plain text
      try {
        const recordRes = await fetch(`${TEABLE_URL}/api/table/${INBOX_TABLE_ID}/record/${recordId}?fieldKeyType=id`, {
          headers: { Authorization: `Bearer ${TEABLE_KEY}` },
        });
        if (recordRes.ok) {
          const record = await recordRes.json();
          const content = record.fields?.[CONTENT_FIELD] as string;
          if (content && detectContentType(content) === "text") {
            const tidied = tidyText(content);
            if (tidied !== content) {
              await fetch(`${TEABLE_URL}/api/table/${INBOX_TABLE_ID}/record`, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${TEABLE_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  fieldKeyType: "id",
                  record: { fields: { [CONTENT_FIELD]: tidied } },
                  recordId,
                }),
              });
            }
          } else if (content) {
            // Clean URL tracking params
            const cleaned = cleanUrl(content);
            if (cleaned !== content) {
              await fetch(`${TEABLE_URL}/api/table/${INBOX_TABLE_ID}/record`, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${TEABLE_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  fieldKeyType: "id",
                  record: { fields: { [CONTENT_FIELD]: cleaned } },
                  recordId,
                }),
              });
            }
          }
        }
      } catch {
        // Non-fatal — passphrase was still assigned
      }

      return NextResponse.json({ success: true, passphrase, recordId });
    }

    const err = await res.text();
    if (err.includes("unique") || err.includes("duplicate")) {
      continue; // retry with a new passphrase
    }
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({ error: "Failed to generate unique passphrase after retries" }, { status: 500 });
}
