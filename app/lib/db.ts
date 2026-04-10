import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const poolV002 = new Pool({
  connectionString: process.env.DATABASE_URL_V002,
  ssl: { rejectUnauthorized: false },
});

export async function getInboxRecords(limit = 100, offset = 0) {
  const result = await pool.query(
    `SELECT
      i.id::text as id,
      i.title as content,
      i.record_type,
      i.created_at as created_date,
      i.passphrase
    FROM inbox i
    ORDER BY i.created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function getInboxCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM inbox`
  );
  return parseInt(result.rows[0].count);
}
