import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import type { PaletteForPicker } from "@/components/editable-color-cell";
import {
  PicklistStatusTable,
  PicklistColorTable,
  type Status,
  type PicklistColor,
} from "./picklist-tables";

export const metadata = { title: "Pick Lists" };
export const dynamic = "force-dynamic";

const COLOR_COLUMNS = Array.from({ length: 15 }, (_, i) => `color_${i + 1}`);

async function getPicklistColors(): Promise<PicklistColor[]> {
  const result = await poolV002.query(
    `SELECT id::text, "table", field, option, color FROM picklist_colors ORDER BY "table", field, option`
  );
  return result.rows;
}

async function getProjectStatuses(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, color, visible FROM project_statuses ORDER BY name`
  );
  return result.rows;
}

async function getTaskStatuses(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, color FROM task_statuses ORDER BY name`
  );
  return result.rows;
}

async function getCrimeSeriesStatuses(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, color FROM crime_series_statuses ORDER BY sort_order`
  );
  return result.rows;
}

async function getUberProjectsForPickList(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, COALESCE(color, '') as color FROM uber_projects ORDER BY name`
  );
  return result.rows;
}

async function getTalentCategories(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, COALESCE(color, '') as color FROM talent_categories ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}

async function getTalentRatingLevels(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, COALESCE(color, '') as color FROM talent_rating_levels ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}

async function getTalentAreas(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, COALESCE(color, '') as color FROM talent_areas ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}

async function getPalettes(): Promise<PaletteForPicker[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, ${COLOR_COLUMNS.join(", ")} FROM color_palettes ORDER BY created_at DESC`
  );
  return result.rows.map((row: Record<string, string | null>) => ({
    id: row.id as string,
    name: row.name as string,
    colors: COLOR_COLUMNS.map((col) => row[col]),
  }));
}

function PickListSection({
  title,
  usedBy,
  children,
}: {
  title: string;
  usedBy: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground mb-3">Used by: {usedBy}</p>
      {children}
    </section>
  );
}

export default async function PickListsPage() {
  const [
    colors,
    projectStatuses,
    taskStatuses,
    crimeSeriesStatuses,
    uberProjects,
    talentCategories,
    talentRatingLevels,
    talentAreas,
    palettes,
  ] = await Promise.all([
    getPicklistColors(),
    getProjectStatuses(),
    getTaskStatuses(),
    getCrimeSeriesStatuses(),
    getUberProjectsForPickList(),
    getTalentCategories(),
    getTalentRatingLevels(),
    getTalentAreas(),
    getPalettes(),
  ]);

  const grouped = new Map<string, PicklistColor[]>();
  for (const row of colors) {
    const key = `${row.table} → ${row.field}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return (
    <PageShell title="Pick Lists">
      <Realtime
        tables={[
          "picklist_colors",
          "project_statuses",
          "task_statuses",
          "crime_series_statuses",
          "uber_projects",
          "talent_categories",
          "talent_rating_levels",
          "talent_areas",
          "color_palettes",
        ]}
      />
      <div className="space-y-10">
        <PickListSection title="Project Statuses" usedBy="Projects">
          <PicklistStatusTable
            source="project_statuses"
            rows={projectStatuses}
            palettes={palettes}
            showVisible
            storageKey="pick-lists:project_statuses"
          />
        </PickListSection>

        <PickListSection title="Task Statuses" usedBy="Tasks">
          <PicklistStatusTable
            source="task_statuses"
            rows={taskStatuses}
            palettes={palettes}
            storageKey="pick-lists:task_statuses"
          />
        </PickListSection>

        <PickListSection title="Crime Series Statuses" usedBy="Crime Series">
          <PicklistStatusTable
            source="crime_series_statuses"
            rows={crimeSeriesStatuses}
            palettes={palettes}
            storageKey="pick-lists:crime_series_statuses"
          />
        </PickListSection>

        <PickListSection title="Uber Projects" usedBy="Projects | Main">
          <PicklistStatusTable
            source="uber_projects"
            rows={uberProjects}
            palettes={palettes}
            storageKey="pick-lists:uber_projects"
          />
        </PickListSection>

        <PickListSection title="Talent Categories" usedBy="Talent">
          <PicklistStatusTable
            source="talent_categories"
            rows={talentCategories}
            palettes={palettes}
            storageKey="pick-lists:talent_categories"
          />
        </PickListSection>

        <PickListSection title="Talent Rating Levels" usedBy="Talent">
          <PicklistStatusTable
            source="talent_rating_levels"
            rows={talentRatingLevels}
            palettes={palettes}
            storageKey="pick-lists:talent_rating_levels"
          />
        </PickListSection>

        <PickListSection title="Talent Areas" usedBy="Talent (areas of expertise)">
          <PicklistStatusTable
            source="talent_areas"
            rows={talentAreas}
            palettes={palettes}
            storageKey="pick-lists:talent_areas"
          />
        </PickListSection>

        {Array.from(grouped.entries()).map(([key, rows]) => (
          <PickListSection key={key} title={key} usedBy={rows[0].table}>
            <PicklistColorTable
              rows={rows}
              palettes={palettes}
              storageKey={`pick-lists:${rows[0].table}:${rows[0].field}`}
            />
          </PickListSection>
        ))}
      </div>
    </PageShell>
  );
}
