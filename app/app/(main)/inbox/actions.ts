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
  revalidatePath("/super-combo");
}

async function ensureMigratedUber(): Promise<string> {
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
  return uberRes.rows[0].id as string;
}

export async function migrateRecord(recordId: string) {
  const inboxRes = await pool.query(
    `SELECT id::text, title FROM inbox
     WHERE id = $1 AND migrated_at IS NULL`,
    [recordId]
  );
  const inbox = inboxRes.rows[0];
  if (!inbox) return;

  const uberId = await ensureMigratedUber();

  const projectStatusRes = await pool.query(
    `SELECT id FROM project_statuses WHERE name = 'Active' LIMIT 1`
  );
  if (!projectStatusRes.rows[0]) throw new Error("Active project status missing");

  const taskStatusRes = await pool.query(
    `SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`
  );
  if (!taskStatusRes.rows[0]) throw new Error("Tickled task status missing");

  const title = inbox.title || "(untitled)";

  const projectRes = await pool.query(
    `INSERT INTO projects (name, uber_project_id, status_id, is_draft)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [title, uberId, projectStatusRes.rows[0].id]
  );
  const projectId = projectRes.rows[0].id as string;

  await pool.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ($1, $2, $3)`,
    [title, projectId, taskStatusRes.rows[0].id]
  );

  await pool.query(
    `UPDATE inbox SET migrated_at = now() WHERE id = $1`,
    [recordId]
  );

  revalidatePath("/inbox");
  revalidatePath("/projects-main");
  revalidatePath("/super-combo");
}

