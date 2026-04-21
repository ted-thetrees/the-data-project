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

export async function getNotesRecords(limit = 100, offset = 0) {
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
      AND i.title !~* '^https?://'
    ORDER BY i.created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function getNotesCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM inbox
      WHERE migrated_at IS NULL AND title !~* '^https?://'`
  );
  return parseInt(result.rows[0].count);
}

const YOUTUBE_URL_REGEX =
  '^https?://(www\\.)?(youtube\\.com/watch\\?v=|youtu\\.be/|youtube\\.com/shorts/)';

export async function getYouTubeRecords(limit = 100, offset = 0) {
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
      AND i.title ~* $3
    ORDER BY i.created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset, YOUTUBE_URL_REGEX]
  );
  return result.rows;
}

export async function getYouTubeCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM inbox
      WHERE migrated_at IS NULL AND title ~* $1`,
    [YOUTUBE_URL_REGEX]
  );
  return parseInt(result.rows[0].count);
}
