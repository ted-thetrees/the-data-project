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
  await poolV002.query(`INSERT INTO get (name) VALUES ('Untitled')`);
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
