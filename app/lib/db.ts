import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

export async function getInboxRecords(limit = 100, offset = 0) {
  const result = await pool.query(
    `SELECT
      i.__id as id,
      i."Title" as content,
      i."Record_Type" as record_type,
      i."Created_Date" as created_date,
      p."Passphrase" as passphrase
    FROM "bsePwEnYg0x7fdbsdZR"."Inbox" i
    LEFT JOIN "bsePwEnYg0x7fdbsdZR"."Passphrases" p ON p."Record_ID" = i.__id
    ORDER BY i."Created_Date" DESC
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
