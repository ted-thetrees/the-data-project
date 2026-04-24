"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidateGetPage() {
  revalidatePath("/get");
}

function parseLookupId(v: string): number | null {
  return v ? Number(v) : null;
}

export async function createGetItem() {
  await poolV002.query(
    `INSERT INTO get (name, sort_order)
     VALUES ('Untitled', (SELECT COALESCE(MIN(sort_order), 0) - 1 FROM get))`,
  );
  revalidateGetPage();
}

export async function createGetItemInGroup(prefill: Record<string, string | null>) {
  const allowed: Record<string, string> = {
    category_id: "category_id",
    status_id: "status_id",
    source_id: "source_id",
  };
  const cols: string[] = ["name", "sort_order"];
  const placeholders: string[] = [
    `'Untitled'`,
    `(SELECT COALESCE(MIN(sort_order), 0) - 1 FROM get)`,
  ];
  const params: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(prefill)) {
    if (!allowed[k]) continue;
    params.push(v ? Number(v) : null);
    cols.push(allowed[k]);
    placeholders.push(`$${params.length}`);
  }
  await poolV002.query(
    `INSERT INTO get (${cols.join(",")}) VALUES (${placeholders.join(",")})`,
    params,
  );
  revalidateGetPage();
}

export async function reorderGetRows(orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const values = orderedIds.map((_, i) => `($${i * 2 + 1}::bigint, $${i * 2 + 2}::int)`).join(",");
  const params: (string | number)[] = [];
  orderedIds.forEach((id, i) => {
    params.push(id, i);
  });
  await poolV002.query(
    `UPDATE get g SET sort_order = v.sort_order
     FROM (VALUES ${values}) AS v(id, sort_order)
     WHERE g.id = v.id`,
    params,
  );
  revalidateGetPage();
}

export async function deleteGetItem(id: string) {
  await poolV002.query(`DELETE FROM get WHERE id = $1`, [id]);
  revalidateGetPage();
}

export async function updateGetName(id: string, value: string) {
  await poolV002.query(
    `UPDATE get SET name = $1, updated_at = now() WHERE id = $2`,
    [value || "Untitled", id],
  );
  revalidateGetPage();
}

export async function updateGetCategory(id: string, categoryId: string) {
  await poolV002.query(
    `UPDATE get SET category_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(categoryId), id],
  );
  revalidateGetPage();
}

export async function updateGetStatus(id: string, statusId: string) {
  await poolV002.query(
    `UPDATE get SET status_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(statusId), id],
  );
  revalidateGetPage();
}

export async function updateGetSource(id: string, sourceId: string) {
  await poolV002.query(
    `UPDATE get SET source_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(sourceId), id],
  );
  revalidateGetPage();
}

export async function updateGetSourceDetail(id: string, value: string) {
  await poolV002.query(
    `UPDATE get SET source_detail = $1, updated_at = now() WHERE id = $2`,
    [value || null, id],
  );
  revalidateGetPage();
}

export async function updateGetUrl(id: string, value: string | null) {
  await poolV002.query(
    `UPDATE get SET url = $1, updated_at = now() WHERE id = $2`,
    [value, id],
  );
  revalidateGetPage();
}

export async function updateGetNotes(id: string, value: string) {
  await poolV002.query(
    `UPDATE get SET notes = $1, updated_at = now() WHERE id = $2`,
    [value || null, id],
  );
  revalidateGetPage();
}
