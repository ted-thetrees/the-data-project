import { NextRequest, NextResponse } from "next/server";
import { poolV002 } from "@/lib/db";

const SOURCE_TABLES: Record<string, string> = {
  picklist_colors: "picklist_colors",
  project_statuses: "project_statuses",
  task_statuses: "task_statuses",
  crime_series_statuses: "crime_series_statuses",
  uber_projects: "uber_projects",
  talent_categories: "talent_categories",
  talent_rating_levels: "talent_rating_levels",
  talent_areas: "talent_areas",
  user_story_roles: "user_story_roles",
  user_story_categories: "user_story_categories",
  people_familiarity_levels: "people_familiarity_levels",
  people_genders: "people_genders",
  people_teller_statuses: "people_teller_statuses",
  people_org_fill_statuses: "people_org_fill_statuses",
  people_metro_areas: "people_metro_areas",
  backlog_priorities: "backlog_priorities",
  backlog_categories: "backlog_categories",
  backlog_yes_or_not_yet: "backlog_yes_or_not_yet",
  backlog_design_paradigms: "backlog_design_paradigms",
  backlog_statuses: "backlog_statuses",
  backlog_prototype_stages: "backlog_prototype_stages",
  jtbd_jobs: "jtbd_jobs",
  jtbd_thinkers: "jtbd_thinkers",
  jtbd_components: "jtbd_components",
  get_categories: "get_categories",
  get_statuses: "get_statuses",
  get_sources: "get_sources",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(req: NextRequest) {
  let body: { source?: unknown; id?: unknown; color?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const source = typeof body.source === "string" ? body.source : "";
  const id = typeof body.id === "string" ? body.id : "";
  const color = typeof body.color === "string" ? body.color.trim() : "";

  const table = SOURCE_TABLES[source];
  if (!table) {
    return NextResponse.json({ error: "invalid source" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (!HEX_RE.test(color)) {
    return NextResponse.json({ error: "color must be #rrggbb" }, { status: 400 });
  }

  const result = await poolV002.query(
    `UPDATE ${table} SET color = $1 WHERE id = $2 RETURNING id::text, color`,
    [color.toLowerCase(), id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, ...result.rows[0] });
}
