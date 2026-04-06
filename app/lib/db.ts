import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Baserow table IDs → Postgres table names
export const BR = {
  Inbox: "database_table_179",
  Passphrases: "database_table_180",
} as const;

// Baserow field_* column mappings
export const F = {
  // Inbox (179)
  inbox_title: "field_1737",
  inbox_record_type: "field_1738",
  inbox_created_date: "field_1739",
  inbox_teable_id: "field_1740",
  // Passphrases (180)
  pass_passphrase: "field_1744",
  pass_table_name: "field_1745",
  pass_record_id: "field_1746",
  pass_created_date: "field_1747",
  pass_teable_id: "field_1748",
} as const;

export async function getInboxRecords(limit = 100, offset = 0) {
  const result = await pool.query(
    `SELECT
      i.id::text as id,
      i.${F.inbox_title} as content,
      i.${F.inbox_record_type} as record_type,
      i.${F.inbox_created_date} as created_date,
      p.${F.pass_passphrase} as passphrase
    FROM ${BR.Inbox} i
    LEFT JOIN ${BR.Passphrases} p ON p.${F.pass_record_id} = i.${F.inbox_teable_id}
    WHERE i.trashed = false
    ORDER BY i.${F.inbox_created_date} DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function getInboxCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM ${BR.Inbox} WHERE trashed = false`
  );
  return parseInt(result.rows[0].count);
}
