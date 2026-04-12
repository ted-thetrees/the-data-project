"use server";

import { revalidatePath } from "next/cache";
import { removePassphrase } from "@/lib/passphrase";
import { pool } from "@/lib/db";

export async function deleteRecord(recordId: string) {
  await pool.query(
    `DELETE FROM inbox WHERE id = $1`,
    [recordId]
  );

  await removePassphrase(recordId);
  revalidatePath("/inbox");
}

async function ensureMigratedBucket(): Promise<string> {
  const uberRes = await pool.query(
    `WITH ins AS (
       INSERT INTO uber_projects (name)
       VALUES ('Migrated')
       ON CONFLICT (name) DO NOTHING
       RETURNING id
     )
     SELECT id FROM ins
     UNION ALL
     SELECT id FROM uber_projects WHERE name = 'Migrated'
     LIMIT 1`
  );
  const uberId = uberRes.rows[0].id as string;

  const existing = await pool.query(
    `SELECT id FROM projects
     WHERE name = 'Migrated' AND uber_project_id = $1
     LIMIT 1`,
    [uberId]
  );
  if (existing.rows[0]) return existing.rows[0].id as string;

  const statusRes = await pool.query(
    `SELECT id FROM project_statuses WHERE name = 'Active' LIMIT 1`
  );
  if (!statusRes.rows[0]) throw new Error("Active project status missing");

  const projectRes = await pool.query(
    `INSERT INTO projects (name, uber_project_id, status_id)
     VALUES ('Migrated', $1, $2)
     RETURNING id`,
    [uberId, statusRes.rows[0].id]
  );
  return projectRes.rows[0].id as string;
}

export async function migrateRecord(recordId: string) {
  const inboxRes = await pool.query(
    `SELECT id::text, title FROM inbox
     WHERE id = $1 AND migrated_at IS NULL`,
    [recordId]
  );
  const inbox = inboxRes.rows[0];
  if (!inbox) return;

  const projectId = await ensureMigratedBucket();

  const taskStatusRes = await pool.query(
    `SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`
  );
  if (!taskStatusRes.rows[0]) throw new Error("Tickled task status missing");

  await pool.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ($1, $2, $3)`,
    [inbox.title || "(untitled)", projectId, taskStatusRes.rows[0].id]
  );

  await pool.query(
    `UPDATE inbox SET migrated_at = now() WHERE id = $1`,
    [recordId]
  );

  revalidatePath("/inbox");
  revalidatePath("/projects-main");
}
