"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/jtbd/jobs");
  revalidatePath("/jtbd/thinkers");
  revalidatePath("/jtbd/components");
}

export async function createJob() {
  await poolV002.query(
    `INSERT INTO jtbd_jobs (name, sort_order)
     VALUES ('Untitled ' || substring(gen_random_uuid()::text, 1, 4),
             COALESCE((SELECT MAX(sort_order) FROM jtbd_jobs), 0) + 10)`,
  );
  revalidateAll();
}

export async function updateJobName(jobId: string, name: string) {
  await poolV002.query(
    `UPDATE jtbd_jobs SET name = $1, updated_at = now() WHERE id = $2`,
    [name, jobId],
  );
  revalidateAll();
}

export async function updateJobNotes(jobId: string, notes: string) {
  await poolV002.query(
    `UPDATE jtbd_jobs SET notes = $1, updated_at = now() WHERE id = $2`,
    [notes || null, jobId],
  );
  revalidateAll();
}
