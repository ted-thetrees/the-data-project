"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

const SOURCE_TABLES: Record<string, { table: string; hasSortOrder: boolean }> = {
  project_statuses: { table: "project_statuses", hasSortOrder: false },
  task_statuses: { table: "task_statuses", hasSortOrder: false },
  crime_series_statuses: { table: "crime_series_statuses", hasSortOrder: true },
  uber_projects: { table: "uber_projects", hasSortOrder: false },
  talent_categories: { table: "talent_categories", hasSortOrder: true },
  talent_types: { table: "talent_types", hasSortOrder: true },
  talent_rating_levels: { table: "talent_rating_levels", hasSortOrder: true },
};

function revalidate() {
  revalidatePath("/pick-lists");
  revalidatePath("/super-combo");
  revalidatePath("/projects-main");
  revalidatePath("/series");
  revalidatePath("/series-sort");
  revalidatePath("/talent");
  revalidatePath("/architecture");
}

export async function createPicklistOption(source: string) {
  const config = SOURCE_TABLES[source];
  if (!config) throw new Error(`Invalid picklist source: ${source}`);

  // Placeholder name ensures new rows are visible and clickable to rename
  const sortClause = config.hasSortOrder
    ? `, sort_order`
    : "";
  const sortValue = config.hasSortOrder
    ? `, COALESCE((SELECT MAX(sort_order) + 1 FROM ${config.table}), 1)`
    : "";
  await poolV002.query(
    `INSERT INTO ${config.table} (name, color${sortClause})
     VALUES ('New option', '#727272'${sortValue})`,
  );
  revalidate();
}

export async function updatePicklistName(
  source: string,
  id: string,
  name: string,
) {
  const config = SOURCE_TABLES[source];
  if (!config) throw new Error(`Invalid picklist source: ${source}`);
  await poolV002.query(
    `UPDATE ${config.table} SET name = $1 WHERE id = $2`,
    [name || "Untitled", id],
  );
  revalidate();
}
