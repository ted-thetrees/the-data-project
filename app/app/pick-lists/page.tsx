import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { DataTable, type Column } from "@/components/data-table";
import { Swatch } from "@/components/swatch";

export const metadata = { title: "Pick Lists" };
export const dynamic = "force-dynamic";

type PicklistColor = {
  table: string;
  field: string;
  option: string;
  color: string;
};

type Status = {
  name: string;
  color: string;
  visible?: boolean;
};

async function getPicklistColors(): Promise<PicklistColor[]> {
  const result = await poolV002.query(
    `SELECT "table", field, option, color FROM picklist_colors ORDER BY "table", field, option`
  );
  return result.rows;
}

async function getProjectStatuses(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT name, color, visible FROM project_statuses ORDER BY name`
  );
  return result.rows;
}

async function getTaskStatuses(): Promise<Status[]> {
  const result = await poolV002.query(
    `SELECT name, color FROM task_statuses ORDER BY name`
  );
  return result.rows;
}

const statusColumns: Column<Status>[] = [
  { key: "name", header: "Option" },
  {
    key: "color",
    header: "Color",
    render: (row) => <Swatch color={row.color} />,
  },
  {
    key: "hex",
    header: "Hex",
    render: (row) => (
      <span className="font-mono text-xs text-muted-foreground">{row.color}</span>
    ),
  },
];

const statusColumnsWithVisible: Column<Status>[] = [
  ...statusColumns,
  {
    key: "visible",
    header: "Visible",
    render: (row) => (
      <span className="text-muted-foreground">{row.visible ? "Yes" : "No"}</span>
    ),
  },
];

const picklistColumns: Column<PicklistColor>[] = [
  { key: "option", header: "Option" },
  {
    key: "color",
    header: "Color",
    render: (row) => <Swatch color={row.color} />,
  },
  {
    key: "hex",
    header: "Hex",
    render: (row) => (
      <span className="font-mono text-xs text-muted-foreground">{row.color}</span>
    ),
  },
];

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
  const [colors, projectStatuses, taskStatuses] = await Promise.all([
    getPicklistColors(),
    getProjectStatuses(),
    getTaskStatuses(),
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
            columns={statusColumnsWithVisible}
            rows={projectStatuses}
            rowKey={(r) => r.name}
          />
        </PickListSection>

        <PickListSection title="Task Statuses" usedBy="Tasks">
          <DataTable
            columns={statusColumns}
            rows={taskStatuses}
            rowKey={(r) => r.name}
          />
        </PickListSection>

        {Array.from(grouped.entries()).map(([key, rows]) => (
          <PickListSection key={key} title={key} usedBy={rows[0].table}>
            <DataTable
              columns={picklistColumns}
              rows={rows}
              rowKey={(r) => r.option}
            />
          </PickListSection>
        ))}
      </div>
    </PageShell>
  );
}
