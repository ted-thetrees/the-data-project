"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";

const PATH = "/table-features";

export async function updateCoverage(
  tableId: string,
  featureId: string,
  statusId: string,
) {
  const value = statusId && statusId.length > 0 ? Number(statusId) : null;
  await poolV002.query(
    `INSERT INTO tables_coverage (table_id, feature_id, status_id, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (table_id, feature_id)
     DO UPDATE SET status_id = EXCLUDED.status_id, updated_at = now()`,
    [Number(tableId), Number(featureId), value],
  );
  updateTag("table-features");
  revalidatePath(PATH);
}

export async function toggleDefaultForNew(featureId: string, value: boolean) {
  await poolV002.query(
    `UPDATE tables_features SET default_for_new = $1 WHERE id = $2`,
    [value, Number(featureId)],
  );
  updateTag("table-features");
  revalidatePath(PATH);
}

export async function createCatalogRow() {
  await poolV002.query(
    `INSERT INTO tables_catalog (name, sort_order)
     VALUES ('Untitled table ' || substring(gen_random_uuid()::text, 1, 4),
             COALESCE((SELECT MAX(sort_order) + 10 FROM tables_catalog), 10))`,
  );
  updateTag("table-features");
  revalidatePath(PATH);
}

export async function updateCatalogName(tableId: string, name: string) {
  await poolV002.query(
    `UPDATE tables_catalog SET name = $1, updated_at = now() WHERE id = $2`,
    [name, Number(tableId)],
  );
  updateTag("table-features");
  revalidatePath(PATH);
}

export async function updateCatalogPath(tableId: string, path: string) {
  await poolV002.query(
    `UPDATE tables_catalog SET path = $1, updated_at = now() WHERE id = $2`,
    [path, Number(tableId)],
  );
  updateTag("table-features");
  revalidatePath(PATH);
}

export async function updateDisplayType(tableId: string, displayTypeId: string) {
  const value = displayTypeId && displayTypeId.length > 0 ? Number(displayTypeId) : null;
  await poolV002.query(
    `UPDATE tables_catalog SET display_type_id = $1, updated_at = now() WHERE id = $2`,
    [value, Number(tableId)],
  );
  updateTag("table-features");
  revalidatePath(PATH);
}

export async function deleteCatalogRow(tableId: string) {
  await poolV002.query(`DELETE FROM tables_catalog WHERE id = $1`, [Number(tableId)]);
  updateTag("table-features");
  revalidatePath(PATH);
}
