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
  backlog_priorities: { table: "backlog_priorities", hasSortOrder: true },
  backlog_categories: { table: "backlog_categories", hasSortOrder: true },
  backlog_yes_or_not_yet: { table: "backlog_yes_or_not_yet", hasSortOrder: true },
  backlog_design_paradigms: { table: "backlog_design_paradigms", hasSortOrder: true },
  backlog_statuses: { table: "backlog_statuses", hasSortOrder: true },
  backlog_prototype_stages: { table: "backlog_prototype_stages", hasSortOrder: true },
  get_categories: { table: "get_categories", hasSortOrder: true },
  get_statuses: { table: "get_statuses", hasSortOrder: true },
  get_sources: { table: "get_sources", hasSortOrder: true },
};

function revalidate() {
  revalidatePath("/pick-lists");
  revalidatePath("/pick-lists/projects");
  revalidatePath("/pick-lists/talent");
  revalidatePath("/pick-lists/user-stories");
  revalidatePath("/pick-lists/people");
  revalidatePath("/pick-lists/crime-series");
  revalidatePath("/pick-lists/backlog");
  revalidatePath("/pick-lists/get");
  revalidatePath("/backlog");
  revalidatePath("/projects-main");
  revalidatePath("/series");
  revalidatePath("/series-sort");
  revalidatePath("/talent");
  revalidatePath("/user-stories");
  revalidatePath("/people");
  revalidatePath("/get");
}

export async function createPicklistOptionNamed(
  source: string,
  name: string,
): Promise<{ id: string; name: string; color: string | null }> {
  const config = SOURCE_TABLES[source];
  if (!config) throw new Error(`Invalid picklist source: ${source}`);
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Name is required");

  // Inherit color from the first existing option so created tags blend in.
  const colorRow = await poolV002.query<{ color: string | null }>(
    `SELECT color FROM ${config.table} ORDER BY sort_order NULLS LAST, id LIMIT 1`,
  );
  const inheritedColor = colorRow.rows[0]?.color ?? "#727272";

  const columns: string[] = ["name", "color"];
  const params: unknown[] = [cleanName, inheritedColor];
  const placeholders: string[] = ["$1", "$2"];

  if (config.hasSortOrder) {
    columns.push("sort_order");
    placeholders.push(
      `COALESCE((SELECT MAX(sort_order) + 1 FROM ${config.table}), 1)`,
    );
  }

  // For tables with extra NOT NULL columns (e.g. people_metro_areas.full_name),
  // mirror the new name into them so the created row passes constraints. The
  // user can refine these from the Pick Lists page.
  for (const col of Object.keys(config.extraInsertDefaults ?? {})) {
    columns.push(col);
    params.push(cleanName);
    placeholders.push(`$${params.length}`);
  }

  const result = await poolV002.query<{
    id: string;
    name: string;
    color: string | null;
  }>(
    `INSERT INTO ${config.table} (${columns.join(", ")})
     VALUES (${placeholders.join(", ")})
     RETURNING id::text AS id, name, color`,
    params,
  );
  revalidate();
  return result.rows[0];
}

export async function createPicklistOption(source: string) {
  const config = SOURCE_TABLES[source];
  if (!config) throw new Error(`Invalid picklist source: ${source}`);

  // Pick a unique "New option" name — several picklist tables have UNIQUE(name)
  // (and some, like people_metro_areas, also UNIQUE(full_name)), so reusing
  // the literal string would fail on the second click.
  const existing = await poolV002.query(
    `SELECT name FROM ${config.table} WHERE name LIKE 'New option%'`,
  );
  const taken = new Set<string>(
    existing.rows.map((r: { name: string }) => r.name),
  );
  let candidate = "New option";
  let n = 2;
  while (taken.has(candidate)) candidate = `New option ${n++}`;
  const quoted = `'${candidate.replace(/'/g, "''")}'`;

  const columns: string[] = ["name", "color"];
  const values: string[] = [quoted, "'#727272'"];

  if (config.hasSortOrder) {
    columns.push("sort_order");
    values.push(
      `COALESCE((SELECT MAX(sort_order) + 1 FROM ${config.table}), 1)`,
    );
  }

  for (const [col, val] of Object.entries(config.extraInsertDefaults ?? {})) {
    columns.push(col);
    const actual = val === "New option" ? candidate : val;
    values.push(`'${actual.replace(/'/g, "''")}'`);
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

export async function updatePicklistFullName(
  source: string,
  id: string,
  fullName: string,
) {
  const config = SOURCE_TABLES[source];
  if (!config) throw new Error(`Invalid picklist source: ${source}`);
  await poolV002.query(
    `UPDATE ${config.table} SET full_name = $1 WHERE id = $2`,
    [fullName || "Untitled", id],
  );
  revalidate();
}

export async function reorderPicklistOptions(
  source: string,
  orderedIds: string[],
) {
  const config = SOURCE_TABLES[source];
  if (!config) throw new Error(`Invalid picklist source: ${source}`);
  if (!config.hasSortOrder) {
    throw new Error(`${source} does not support reordering`);
  }
  if (orderedIds.length === 0) return;
  await poolV002.query(
    `UPDATE ${config.table} AS t
       SET sort_order = u.ord
       FROM unnest($1::bigint[]) WITH ORDINALITY AS u(id, ord)
       WHERE t.id = u.id`,
    [orderedIds],
  );
  revalidate();
}
