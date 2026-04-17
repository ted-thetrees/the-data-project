"use server";

import { revalidatePath } from "next/cache";
import { removePassphrase } from "@/lib/passphrase";
import { pool, getInboxRecords } from "@/lib/db";
import { capturePreviewForInbox } from "@/lib/preview-service";
import { resolveInboxCards, type CardData } from "./card-data";

export async function loadMoreInboxCards(
  offset: number,
  limit = 50,
): Promise<CardData[]> {
  const rows = await getInboxRecords(limit, offset);
  return resolveInboxCards(rows);
}

export async function countPendingPreviews(): Promise<number> {
  const res = await pool.query(
    `SELECT count(*)::int AS n
       FROM inbox
      WHERE migrated_at IS NULL
        AND preview_fetched_at IS NULL
        AND title ~* '^https?://'`,
  );
  return res.rows[0]?.n ?? 0;
}

export async function backfillOneInboxPreview(): Promise<{
  processed: boolean;
  remaining: number;
  recordId: string | null;
}> {
  const pick = await pool.query(
    `SELECT id::text AS id, title
       FROM inbox
      WHERE migrated_at IS NULL
        AND preview_fetched_at IS NULL
        AND title ~* '^https?://'
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  const row = pick.rows[0];
  if (!row) return { processed: false, remaining: 0, recordId: null };

  await capturePreviewForInbox(row.id, row.title);
  const remaining = await countPendingPreviews();
  revalidatePath("/inbox");
  return { processed: true, remaining, recordId: row.id };
}

export async function deleteRecord(recordId: string) {
  await pool.query(
    `DELETE FROM inbox WHERE id = $1`,
    [recordId]
  );

  await removePassphrase(recordId);
  revalidatePath("/inbox");
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
}

