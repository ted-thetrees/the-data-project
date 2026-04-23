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

export async function createBacklogItem() {
  await poolV002.query(
    `INSERT INTO backlog (main_entry) VALUES ('Untitled')`,
  );
  revalidateBacklogPage();
}

const CREATE_PREFILL_COLUMNS = new Set([
  "priority_id",
  "primary_category_id",
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

export async function reorderBacklogRows(orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const ids = orderedIds.map((v) => Number(v));
  await poolV002.query(
    `UPDATE backlog AS t
       SET sort_order = u.ord
       FROM unnest($1::bigint[]) WITH ORDINALITY AS u(id, ord)
       WHERE t.id = u.id`,
    [ids],
  );
  revalidateBacklogPage();
}
