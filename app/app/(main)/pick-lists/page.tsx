import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { DataTable, type Column } from "@/components/data-table";
import {
  EditableColorCell,
  type PaletteForPicker,
} from "@/components/editable-color-cell";

export const metadata = { title: "Pick Lists" };
export const dynamic = "force-dynamic";

type PicklistColor = {
  id: string;
  table: string;
  field: string;
  option: string;
  color: string;
};

type Status = {
  id: string;
  name: string;
  color: string;
  visible?: boolean;
};

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

function statusColumns(
  source: string,
  palettes: PaletteForPicker[]
): Column<Status>[] {
  return [
    { key: "name", header: "Option" },
    {
      key: "color",
      header: "Color",
      render: (row) => (
        <EditableColorCell
          source={source}
          recordId={row.id}
          color={row.color}
          palettes={palettes}
        />
      ),
    },
    {
      key: "hex",
      header: "Hex",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.color}</span>
      ),
    },
  ];
}

function statusColumnsWithVisible(
  source: string,
  palettes: PaletteForPicker[]
): Column<Status>[] {
  return [
    ...statusColumns(source, palettes),
    {
      key: "visible",
      header: "Visible",
      render: (row) => (
        <span className="text-muted-foreground">{row.visible ? "Yes" : "No"}</span>
      ),
    },
  ];
}

function picklistColumns(palettes: PaletteForPicker[]): Column<PicklistColor>[] {
  return [
    { key: "option", header: "Option" },
    {
      key: "color",
      header: "Color",
      render: (row) => (
        <EditableColorCell
          source="picklist_colors"
          recordId={row.id}
          color={row.color}
          palettes={palettes}
        />
      ),
    },
    {
      key: "hex",
      header: "Hex",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.color}</span>
      ),
    },
  ];
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
  const [colors, projectStatuses, taskStatuses, crimeSeriesStatuses, palettes] =
    await Promise.all([
      getPicklistColors(),
      getProjectStatuses(),
      getTaskStatuses(),
      getCrimeSeriesStatuses(),
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
      <div className="space-y-10">
        <PickListSection title="Project Statuses" usedBy="Projects">
          <DataTable
            columns={statusColumnsWithVisible("project_statuses", palettes)}
            rows={projectStatuses}
            rowKey={(r) => r.id}
          />
        </PickListSection>

        <PickListSection title="Task Statuses" usedBy="Tasks">
          <DataTable
            columns={statusColumns("task_statuses", palettes)}
            rows={taskStatuses}
            rowKey={(r) => r.id}
          />
        </PickListSection>

        <PickListSection title="Crime Series Statuses" usedBy="Crime Series">
          <DataTable
            columns={statusColumns("crime_series_statuses", palettes)}
            rows={crimeSeriesStatuses}
            rowKey={(r) => r.id}
          />
        </PickListSection>

        {Array.from(grouped.entries()).map(([key, rows]) => (
          <PickListSection key={key} title={key} usedBy={rows[0].table}>
            <DataTable
              columns={picklistColumns(palettes)}
              rows={rows}
              rowKey={(r) => r.id}
            />
          </PickListSection>
        ))}
      </div>
    </PageShell>
  );
}
