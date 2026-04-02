import { Pool } from "pg";

export const pool = new Pool({
  host: "127.0.0.1",
  port: 42345,
  database: "thedataproject",
  user: "teable",
  password: "teable-local-dev-2026",
});

export async function getInboxRecords(limit = 100, offset = 0) {
  const result = await pool.query(
    `SELECT
      __id as id,
      "Title" as content,
      "Record_Type" as record_type,
      "Created_Date" as created_date,
      "Needs_SS" as needs_ss
    FROM "bsePwEnYg0x7fdbsdZR"."Inbox"
    ORDER BY "Created_Date" DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function getInboxCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM "bsePwEnYg0x7fdbsdZR"."Inbox"`
  );
  return parseInt(result.rows[0].count);
}
