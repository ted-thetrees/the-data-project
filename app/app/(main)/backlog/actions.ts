"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidateBacklogPage() {
  revalidatePath("/backlog");
}

function parseLookupId(v: string): number | null {
  return v ? Number(v) : null;
}

export async function updateBacklogMainEntry(id: string, value: string) {
  await poolV002.query(
    `UPDATE backlog SET main_entry = $1, updated_at = now() WHERE id = $2`,
    [value || "Untitled", id],
  );
  revalidateBacklogPage();
}

export async function updateBacklogDetails(id: string, value: string) {
  await poolV002.query(
    `UPDATE backlog SET details = $1, updated_at = now() WHERE id = $2`,
    [value || null, id],
  );
  revalidateBacklogPage();
}

export async function updateBacklogPriority(id: string, priorityId: string) {
  await poolV002.query(
    `UPDATE backlog SET priority_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(priorityId), id],
  );
  revalidateBacklogPage();
}

export async function updateBacklogCategory(id: string, categoryId: string) {
  await poolV002.query(
    `UPDATE backlog SET primary_category_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(categoryId), id],
  );
  revalidateBacklogPage();
}

export async function updateBacklogYesOrNotYet(id: string, yesId: string) {
  await poolV002.query(
    `UPDATE backlog SET yes_or_not_yet_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(yesId), id],
  );
  revalidateBacklogPage();
}

export async function updateBacklogDesignParadigm(id: string, paradigmId: string) {
  await poolV002.query(
    `UPDATE backlog SET design_paradigm_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(paradigmId), id],
  );
  revalidateBacklogPage();
}

export async function updateBacklogStatus(id: string, statusId: string) {
  await poolV002.query(
    `UPDATE backlog SET status_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(statusId), id],
  );
  revalidateBacklogPage();
}

export async function updateBacklogPrototypeStage(id: string, stageId: string) {
  await poolV002.query(
    `UPDATE backlog SET prototype_stage_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(stageId), id],
  );
  revalidateBacklogPage();
}

export async function createBacklogItem() {
  await poolV002.query(
    `INSERT INTO backlog (main_entry) VALUES ('Untitled')`,
  );
  revalidateBacklogPage();
}

const CREATE_PREFILL_COLUMNS = new Set([
  "priority_id",
  "primary_category_id",
  "status_id",
  "yes_or_not_yet_id",
  "design_paradigm_id",
  "prototype_stage_id",
]);

export async function createBacklogItemInGroup(
  prefill: Record<string, string | null>,
) {
  const cols: string[] = ["main_entry"];
  const values: (string | number | null)[] = ["Untitled"];
  for (const [k, v] of Object.entries(prefill)) {
    if (!CREATE_PREFILL_COLUMNS.has(k)) continue;
    cols.push(k);
    values.push(v == null || v === "" ? null : Number(v));
  }
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  // sort_order = MIN(existing) - 1 so the new row lands above every other
  // backlog row in any in-memory sort_order-based ordering.
  await poolV002.query(
    `INSERT INTO backlog (${cols.join(", ")}, sort_order)
     VALUES (${placeholders}, (SELECT COALESCE(MIN(sort_order), 0) - 1 FROM backlog))`,
    values,
  );
  revalidateBacklogPage();
}

export async function deleteBacklogItem(id: string) {
  await poolV002.query(`DELETE FROM backlog WHERE id = $1`, [id]);
  revalidateBacklogPage();
}
