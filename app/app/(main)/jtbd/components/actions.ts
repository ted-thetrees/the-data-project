"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { PillOption } from "@/components/pill";

function revalidateAll() {
  revalidatePath("/jtbd/components");
  revalidatePath("/jtbd/jobs");
  revalidatePath("/jtbd/thinkers");
}

export async function createComponent() {
  await poolV002.query(
    `INSERT INTO jtbd_components (name, sort_order)
     VALUES ('Untitled ' || substring(gen_random_uuid()::text, 1, 4),
             COALESCE((SELECT MAX(sort_order) FROM jtbd_components), 0) + 10)`,
  );
  revalidateAll();
}

export async function updateComponentName(componentId: string, name: string) {
  await poolV002.query(
    `UPDATE jtbd_components SET name = $1, updated_at = now() WHERE id = $2`,
    [name, componentId],
  );
  revalidateAll();
}

export async function updateComponentNotes(componentId: string, notes: string) {
  await poolV002.query(
    `UPDATE jtbd_components SET notes = $1, updated_at = now() WHERE id = $2`,
    [notes || null, componentId],
  );
  revalidateAll();
}

export async function addComponentJob(componentId: string, jobId: string) {
  await poolV002.query(
    `INSERT INTO jtbd_component_jobs (component_id, job_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [componentId, jobId],
  );
  revalidateAll();
}

export async function removeComponentJob(componentId: string, jobId: string) {
  await poolV002.query(
    `DELETE FROM jtbd_component_jobs WHERE component_id = $1 AND job_id = $2`,
    [componentId, jobId],
  );
  revalidateAll();
}

export async function deleteComponent(id: string) {
  await poolV002.query(`DELETE FROM jtbd_components WHERE id = $1`, [id]);
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
