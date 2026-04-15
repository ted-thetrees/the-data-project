"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

type SourceConfig = {
  table: string;
  hasSortOrder: boolean;
  // Extra NOT NULL columns that need defaults on insert
  extraInsertDefaults?: Record<string, string>;
};

const SOURCE_TABLES: Record<string, SourceConfig> = {
  project_statuses: { table: "project_statuses", hasSortOrder: false },
  task_statuses: { table: "task_statuses", hasSortOrder: false },
  crime_series_statuses: { table: "crime_series_statuses", hasSortOrder: true },
  uber_projects: { table: "uber_projects", hasSortOrder: false },
  talent_categories: { table: "talent_categories", hasSortOrder: true },
  talent_rating_levels: { table: "talent_rating_levels", hasSortOrder: true },
  talent_areas: { table: "talent_areas", hasSortOrder: true },
  user_story_roles: { table: "user_story_roles", hasSortOrder: true },
  user_story_categories: { table: "user_story_categories", hasSortOrder: true },
  people_familiarity_levels: { table: "people_familiarity_levels", hasSortOrder: true },
  people_genders: { table: "people_genders", hasSortOrder: true },
  people_teller_statuses: { table: "people_teller_statuses", hasSortOrder: true },
  people_org_fill_statuses: { table: "people_org_fill_statuses", hasSortOrder: true },
  people_metro_areas: {
    table: "people_metro_areas",
    hasSortOrder: true,
    extraInsertDefaults: { full_name: "New option" },
  },
};

function revalidate() {
  revalidatePath("/pick-lists");
  revalidatePath("/pick-lists/projects");
  revalidatePath("/pick-lists/talent");
  revalidatePath("/pick-lists/user-stories");
  revalidatePath("/pick-lists/people");
  revalidatePath("/pick-lists/crime-series");
  revalidatePath("/projects-main");
  revalidatePath("/series");
  revalidatePath("/series-sort");
  revalidatePath("/talent");
  revalidatePath("/user-stories");
  revalidatePath("/people");
}

export async function createPicklistOption(source: string) {
  const config = SOURCE_TABLES[source];
  if (!config) throw new Error(`Invalid picklist source: ${source}`);

  const columns: string[] = ["name", "color"];
  const values: string[] = ["'New option'", "'#727272'"];

  if (config.hasSortOrder) {
    columns.push("sort_order");
    values.push(
      `COALESCE((SELECT MAX(sort_order) + 1 FROM ${config.table}), 1)`,
    );
  }

  for (const [col, val] of Object.entries(config.extraInsertDefaults ?? {})) {
    columns.push(col);
    values.push(`'${val.replace(/'/g, "''")}'`);
  }

  await poolV002.query(
    `INSERT INTO ${config.table} (${columns.join(", ")}) VALUES (${values.join(", ")})`,
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
