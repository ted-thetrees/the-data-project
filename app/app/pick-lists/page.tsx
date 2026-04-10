import { poolV002 } from "@/lib/db";

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

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-5 h-5 rounded-sm border border-border shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function StatusTable({
  title,
  usedBy,
  rows,
  showVisible,
}: {
  title: string;
  usedBy: string[];
  rows: Status[];
  showVisible?: boolean;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Used by: {usedBy.join(", ")}
      </p>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
              <th className="text-left px-3 py-2 font-semibold">Option</th>
              <th className="text-left px-3 py-2 font-semibold">Color</th>
              <th className="text-left px-3 py-2 font-semibold">Hex</th>
              {showVisible && (
                <th className="text-left px-3 py-2 font-semibold">Visible</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-border hover:bg-muted/40">
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">
                  <Swatch color={row.color} />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {row.color}
                </td>
                {showVisible && (
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.visible ? "Yes" : "No"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function PickListsPage() {
  const [colors, projectStatuses, taskStatuses] = await Promise.all([
    getPicklistColors(),
    getProjectStatuses(),
    getTaskStatuses(),
  ]);

  // Group picklist_colors by table + field
  const grouped = new Map<string, PicklistColor[]>();
  for (const row of colors) {
    const key = `${row.table} → ${row.field}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return (
    <div className="px-[var(--page-padding-x)] py-[var(--page-padding-y)] max-w-4xl space-y-10">
      <h1 className="text-2xl font-bold tracking-tight">Pick Lists</h1>

      <StatusTable
        title="Project Statuses"
        usedBy={["Projects"]}
        rows={projectStatuses}
        showVisible
      />

      <StatusTable
        title="Task Statuses"
        usedBy={["Tasks"]}
        rows={taskStatuses}
      />

      {Array.from(grouped.entries()).map(([key, rows]) => {
        const tableName = rows[0].table;
        return (
          <section key={key}>
            <h2 className="text-lg font-semibold mb-1">{key}</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Used by: {tableName}
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Option</th>
                    <th className="text-left px-3 py-2 font-semibold">Color</th>
                    <th className="text-left px-3 py-2 font-semibold">Hex</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.option}
                      className="border-t border-border hover:bg-muted/40"
                    >
                      <td className="px-3 py-2">{row.option}</td>
                      <td className="px-3 py-2">
                        <Swatch color={row.color} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {row.color}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
