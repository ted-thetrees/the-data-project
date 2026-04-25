import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { registerPassphrase } from "@/lib/passphrase";
import { detectContentType, cleanUrl } from "@/lib/content";
import { capturePreviewForInbox } from "@/lib/preview-service";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { title, type } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const result = await pool.query(
    `INSERT INTO inbox (title, record_type) VALUES ($1, $2) RETURNING id::text`,
    [title, type || "Note"],
  );

  const recordId = result.rows[0].id;
  const passphrase = await registerPassphrase("Inbox", recordId);

  revalidateTag("inbox", "max");

  const normalized = cleanUrl(title);
  if (detectContentType(normalized) !== "text") {
    waitUntil(capturePreviewForInbox(recordId, normalized).catch(() => {}));
  }

  return NextResponse.json({ success: true, id: recordId, passphrase });
}
