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
    .query(`SELECT id::text, name, color, visible FROM project_statuses ORDER BY name`)
    .then((r) => r.rows as Status[]);
}

export function getTaskStatuses() {
  return getStatusesByName("task_statuses");
}

export function getCrimeSeriesStatuses() {
  return getStatusesByName("crime_series_statuses", "ORDER BY sort_order");
}

export function getUberProjectsForPickList() {
  return getStatusesByName("uber_projects");
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

export async function getPeopleMetroAreas(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, full_name, COALESCE(color, '') as color
     FROM people_metro_areas
     ORDER BY sort_order NULLS LAST, name`,
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
