"use server";

import { revalidatePath, updateTag } from "next/cache";
import { removePassphrase } from "@/lib/passphrase";
import { pool, getInboxRecords, getNotesRecords, getYouTubeRecords } from "@/lib/db";
import { capturePreviewForInbox } from "@/lib/preview-service";
import { resolveInboxCards, type CardData } from "./card-data";

export async function loadMoreInboxCards(
  offset: number,
  limit = 50,
): Promise<CardData[]> {
  const rows = await getInboxRecords(limit, offset);
  return resolveInboxCards(rows);
}

export async function loadMoreNotesCards(
  offset: number,
  limit = 50,
): Promise<CardData[]> {
  const rows = await getNotesRecords(limit, offset);
  return resolveInboxCards(rows);
}

export async function loadMoreYouTubeCards(
  offset: number,
  limit = 50,
): Promise<CardData[]> {
  const rows = await getYouTubeRecords(limit, offset);
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
  updateTag("inbox");
  revalidatePath("/inbox");
  return { processed: true, remaining, recordId: row.id };
}

export async function deleteRecord(recordId: string) {
  await pool.query(
    `DELETE FROM inbox WHERE id = $1`,
    [recordId]
  );

  await removePassphrase(recordId);
  updateTag("inbox");
  revalidatePath("/inbox");
}

export async function updateRecordContent(recordId: string, content: string) {
  await pool.query(
    `UPDATE inbox SET content = $1 WHERE id = $2`,
    [content, recordId],
  );
  updateTag("inbox");
  revalidatePath("/inbox");
  revalidatePath("/notes");
  revalidatePath("/youtube");
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

export async function migrateRecord(recordId: string): Promise<string | null> {
  const inboxRes = await pool.query(
    `SELECT id::text, title FROM inbox
     WHERE id = $1 AND migrated_at IS NULL`,
    [recordId]
  );
  const inbox = inboxRes.rows[0];
  if (!inbox) return null;

  const uberId = await ensureMigratedUber();

  const taskStatusRes = await pool.query(
    `SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`
  );
  if (!taskStatusRes.rows[0]) throw new Error("Tickled task status missing");

  const title = inbox.title || "(untitled)";

  const projectRes = await pool.query(
    `INSERT INTO projects (name, uber_project_id)
     VALUES ($1, $2)
     RETURNING id`,
    [title, uberId]
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

  updateTag("inbox");
  updateTag("projects-main");
  revalidatePath("/inbox");
  revalidatePath("/projects-main");
  return projectId;
}

