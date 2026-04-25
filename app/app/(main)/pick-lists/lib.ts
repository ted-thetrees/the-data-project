import { poolV002 } from "@/lib/db";
import type { PaletteForPicker } from "@/components/editable-color-cell";
import type { Status, PicklistColor } from "./picklist-tables";

const COLOR_COLUMNS = Array.from({ length: 15 }, (_, i) => `color_${i + 1}`);

export async function getPalettes(): Promise<PaletteForPicker[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, ${COLOR_COLUMNS.join(", ")} FROM color_palettes ORDER BY created_at DESC`,
  );
  return result.rows.map((row: Record<string, string | null>) => ({
    id: row.id as string,
    name: row.name as string,
    colors: COLOR_COLUMNS.map((col) => row[col]),
  }));
}

async function getStatusesByName(
  table: string,
  orderClause = "ORDER BY name",
): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, COALESCE(color, '') as color FROM ${table} ${orderClause}`,
  );
  return result.rows;
}

export function getProjectStatuses() {
  return poolV002
    .query(
      `SELECT id::text, name, color, visible FROM project_statuses
       ORDER BY sort_order NULLS LAST, name`,
    )
    .then((r) => r.rows as Status[]);
}

export function getTaskStatuses() {
  return getStatusesByName("task_statuses", "ORDER BY sort_order NULLS LAST, name");
}

export function getCrimeSeriesStatuses() {
  return getStatusesByName("crime_series_statuses", "ORDER BY sort_order");
}

export function getUberProjectsForPickList() {
  return getStatusesByName("uber_projects", "ORDER BY sort_order NULLS LAST, name");
}

export function getProjectActionOrderStatuses() {
  return getStatusesByName(
    "project_action_order_statuses",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export function getProjectEntryStatuses() {
  return getStatusesByName(
    "project_entry_statuses",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export function getTalentCategories() {
  return getStatusesByName("talent_categories", "ORDER BY sort_order NULLS LAST, name");
}

export function getTalentRatingLevels() {
  return getStatusesByName("talent_rating_levels", "ORDER BY sort_order NULLS LAST, name");
}

export function getTalentAreas() {
  return getStatusesByName("talent_areas", "ORDER BY sort_order NULLS LAST, name");
}

export function getUserStoryRoles() {
  return getStatusesByName("user_story_roles", "ORDER BY sort_order NULLS LAST, name");
}

export function getUserStoryCategories() {
  return getStatusesByName("user_story_categories", "ORDER BY sort_order NULLS LAST, name");
}

export function getPeopleFamiliarityLevels() {
  return getStatusesByName(
    "people_familiarity_levels",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export function getPeopleGenders() {
  return getStatusesByName("people_genders", "ORDER BY sort_order NULLS LAST, name");
}

export function getPeopleTellerStatuses() {
  return getStatusesByName(
    "people_teller_statuses",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export function getPeopleOrgFillStatuses() {
  return getStatusesByName(
    "people_org_fill_statuses",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export function getBacklogPriorities() {
  return getStatusesByName("backlog_priorities", "ORDER BY sort_order NULLS LAST, name");
}

export function getBacklogCategories() {
  return getStatusesByName("backlog_categories", "ORDER BY sort_order NULLS LAST, name");
}

export function getBacklogYesOrNotYet() {
  return getStatusesByName(
    "backlog_yes_or_not_yet",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export function getBacklogDesignParadigms() {
  return getStatusesByName(
    "backlog_design_paradigms",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export function getBacklogStatuses() {
  return getStatusesByName("backlog_statuses", "ORDER BY sort_order NULLS LAST, name");
}

export function getBacklogPrototypeStages() {
  return getStatusesByName(
    "backlog_prototype_stages",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export function getGetCategories() {
  return getStatusesByName("get_categories", "ORDER BY sort_order NULLS LAST, name");
}

export function getGetStatuses() {
  return getStatusesByName("get_statuses", "ORDER BY sort_order NULLS LAST, name");
}

export function getGetSources() {
  return getStatusesByName("get_sources", "ORDER BY sort_order NULLS LAST, name");
}

export function getInfImagesBubbleDistributions() {
  return getStatusesByName(
    "inf_images_bubble_distributions",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export function getTablesFeatureStatuses() {
  return getStatusesByName(
    "tables_feature_statuses",
    "ORDER BY sort_order NULLS LAST, name",
  );
}

export async function getInfImagesFolders(): Promise<Status[]> {
  // Show the full folder path as the picklist label so nested folders with
  // duplicate names (e.g., "Yes" under multiple parents) are distinguishable.
  const r = await poolV002.query(
    `SELECT id, full_path AS name, COALESCE(color, '') AS color
     FROM inf_images_folders
     ORDER BY sort_order NULLS LAST, full_path`,
  );
  return r.rows;
}

export async function getPeopleMetroAreas(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, full_name, COALESCE(color, '') as color
     FROM people_metro_areas
     ORDER BY name`,
  );
  return result.rows;
}

export async function getPicklistColorsForTables(
  tables: string[],
): Promise<Map<string, PicklistColor[]>> {
  if (tables.length === 0) return new Map();
  const result = await poolV002.query(
    `SELECT id::text, "table", field, option, color FROM picklist_colors
     WHERE "table" = ANY($1::text[])
     ORDER BY "table", field, option`,
    [tables],
  );
  const rows = result.rows as PicklistColor[];
  const grouped = new Map<string, PicklistColor[]>();
  for (const row of rows) {
    const key = `${row.table} → ${row.field}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  return grouped;
}
