"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";
import type { PillOption } from "@/components/pill";

function revalidateAll() {
  updateTag("jtbd");
  revalidatePath("/jtbd/thinkers");
  revalidatePath("/jtbd/jobs");
  revalidatePath("/jtbd/components");
}

export async function createThinker() {
  await poolV002.query(
    `INSERT INTO jtbd_thinkers (name, sort_order)
     VALUES ('Untitled ' || substring(gen_random_uuid()::text, 1, 4),
             COALESCE((SELECT MAX(sort_order) FROM jtbd_thinkers), 0) + 10)`,
  );
  revalidateAll();
}

export async function updateThinkerName(thinkerId: string, name: string) {
  await poolV002.query(
    `UPDATE jtbd_thinkers SET name = $1, updated_at = now() WHERE id = $2`,
    [name, thinkerId],
  );
  revalidateAll();
}

export async function updateThinkerNotes(thinkerId: string, notes: string) {
  await poolV002.query(
    `UPDATE jtbd_thinkers SET notes = $1, updated_at = now() WHERE id = $2`,
    [notes || null, thinkerId],
  );
  revalidateAll();
}

export async function addThinkerJob(thinkerId: string, jobId: string) {
  await poolV002.query(
    `INSERT INTO jtbd_thinker_jobs (thinker_id, job_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [thinkerId, jobId],
  );
  revalidateAll();
}

export async function removeThinkerJob(thinkerId: string, jobId: string) {
  await poolV002.query(
    `DELETE FROM jtbd_thinker_jobs WHERE thinker_id = $1 AND job_id = $2`,
    [thinkerId, jobId],
  );
  revalidateAll();
}

export async function deleteThinker(id: string) {
  await poolV002.query(`DELETE FROM jtbd_thinkers WHERE id = $1`, [id]);
  revalidateAll();
}

export async function createJobOption(name: string): Promise<PillOption> {
  const result = await poolV002.query(
    `INSERT INTO jtbd_jobs (name, sort_order)
     VALUES ($1, COALESCE((SELECT MAX(sort_order) FROM jtbd_jobs), 0) + 10)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id::text, name, color`,
    [name],
  );
  revalidateAll();
  return result.rows[0];
}
