"use server";

import { poolTDPv4 } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";
import type { PillOption } from "@/components/pill";

function revalidateAll() {
  updateTag("jtbd");
  revalidatePath("/jtbd/jobs");
  revalidatePath("/jtbd/thinkers");
  revalidatePath("/jtbd/components");
}

export async function addJobThinker(jobId: string, thinkerId: string) {
  await poolTDPv4.query(
    `INSERT INTO jtbd_thinker_jobs (thinker_id, job_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [thinkerId, jobId],
  );
  revalidateAll();
}

export async function removeJobThinker(jobId: string, thinkerId: string) {
  await poolTDPv4.query(
    `DELETE FROM jtbd_thinker_jobs WHERE thinker_id = $1 AND job_id = $2`,
    [thinkerId, jobId],
  );
  revalidateAll();
}

export async function addJobComponent(jobId: string, componentId: string) {
  await poolTDPv4.query(
    `INSERT INTO jtbd_component_jobs (component_id, job_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [componentId, jobId],
  );
  revalidateAll();
}

export async function removeJobComponent(jobId: string, componentId: string) {
  await poolTDPv4.query(
    `DELETE FROM jtbd_component_jobs WHERE component_id = $1 AND job_id = $2`,
    [componentId, jobId],
  );
  revalidateAll();
}

export async function createThinkerOption(name: string): Promise<PillOption> {
  const result = await poolTDPv4.query(
    `INSERT INTO jtbd_thinkers (name, sort_order)
     VALUES ($1, COALESCE((SELECT MAX(sort_order) FROM jtbd_thinkers), 0) + 10)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id::text, name, color`,
    [name],
  );
  revalidateAll();
  return result.rows[0];
}

export async function createComponentOption(name: string): Promise<PillOption> {
  const result = await poolTDPv4.query(
    `INSERT INTO jtbd_components (name, sort_order)
     VALUES ($1, COALESCE((SELECT MAX(sort_order) FROM jtbd_components), 0) + 10)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id::text, name, color`,
    [name],
  );
  revalidateAll();
  return result.rows[0];
}

export async function createJob() {
  await poolTDPv4.query(
    `INSERT INTO jtbd_jobs (name, sort_order)
     VALUES ('Untitled ' || substring(gen_random_uuid()::text, 1, 4),
             COALESCE((SELECT MAX(sort_order) FROM jtbd_jobs), 0) + 10)`,
  );
  revalidateAll();
}

export async function updateJobName(jobId: string, name: string) {
  await poolTDPv4.query(
    `UPDATE jtbd_jobs SET name = $1, updated_at = now() WHERE id = $2`,
    [name, jobId],
  );
  revalidateAll();
}

export async function updateJobNotes(jobId: string, notes: string) {
  await poolTDPv4.query(
    `UPDATE jtbd_jobs SET notes = $1, updated_at = now() WHERE id = $2`,
    [notes || null, jobId],
  );
  revalidateAll();
}

export async function deleteJob(id: string) {
  await poolTDPv4.query(`DELETE FROM jtbd_jobs WHERE id = $1`, [id]);
  revalidateAll();
}
