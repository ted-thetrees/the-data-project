import { NextRequest, NextResponse } from "next/server";
import { generatePassphrase } from "@/lib/passphrase";

const TEABLE_KEY = process.env.TEABLE_API_KEY!;
const TEABLE_URL = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
const PASSPHRASES_TABLE_ID = "tblBYrVi2x3KeZOIzYZ";
const INBOX_LINK_FIELD = "fldyn9V5K1K4GAMwWCJ";
const PASSPHRASE_FIELD = "fldzWslh4WONRZPw5a8";
const TABLE_NAME_FIELD = "fldpC2TL3V97XLRbCqC";
const RECORD_ID_FIELD = "fldoyaQH4SLKZXMcVZY";

export async function POST(req: NextRequest) {
  const { recordId, tableName = "Inbox" } = await req.json();

  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  const passphrase = await generatePassphrase();

  // Create passphrase record via Teable API with link to Inbox record
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

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({ success: true, passphrase, recordId });
}
