import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { registerPassphrase } from "@/lib/passphrase";

export async function POST(req: NextRequest) {
  const { title, type } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const result = await pool.query(
    `INSERT INTO inbox (title, record_type) VALUES ($1, $2) RETURNING id::text`,
    [title, type || "Note"]
  );

  const recordId = result.rows[0].id;
  const passphrase = await registerPassphrase("Inbox", recordId);

  return NextResponse.json({ success: true, id: recordId, passphrase });
}
