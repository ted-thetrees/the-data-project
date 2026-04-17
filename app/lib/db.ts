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
      i.preview_image_url,
      i.preview_fetched_at,
      p.passphrase
    FROM inbox i
    LEFT JOIN passphrases p
      ON p.record_id = i.id::text AND p.table_name = 'Inbox'
    WHERE i.migrated_at IS NULL
    ORDER BY i.created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function getInboxCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM inbox WHERE migrated_at IS NULL`
  );
  return parseInt(result.rows[0].count);
}
