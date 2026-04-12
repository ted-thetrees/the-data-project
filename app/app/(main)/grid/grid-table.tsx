"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { PageShell } from "@/components/page-shell";
import type { TaskRow, StatusOption } from "./page";
import {
  updateTaskField,
  updateProjectField,
  updateUberField,
} from "./actions";

interface GroupSpan {
  value: string;
  rowSpan: number;
  startIndex: number;
  color?: string;
  extra?: Record<string, unknown>;
}

function computeGroupSpans(
  data: TaskRow[],
  accessor: (row: TaskRow) => string,
  colorAccessor?: (row: TaskRow) => string,
  extraAccessor?: (row: TaskRow) => Record<string, unknown>,
  parentAccessors?: ((row: TaskRow) => string)[]
): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let current: GroupSpan | null = null;

  data.forEach((row, i) => {
    const val = accessor(row) || "(none)";
    let parentChanged = false;
    if (parentAccessors && i > 0) {
      parentChanged = parentAccessors.some(
        (pa) => (pa(data[i]) || "(none)") !== (pa(data[i - 1]) || "(none)")
      );
    }
    if (!current || current.value !== val || parentChanged) {
      if (current) spans.push(current);
      current = {
        value: val,
        rowSpan: 1,
        startIndex: i,
        color: colorAccessor?.(row),
        extra: extraAccessor?.(row),
      };
    } else {
      current.rowSpan++;
    }
  });
  if (current) spans.push(current);
  return spans;
}

export function GridTable({
  data,
  taskStatuses,
}: {
  data: TaskRow[];
  taskStatuses: StatusOption[];
}) {
  const uberAccessor = (r: TaskRow) => r.uber_project;
  const projectAccessor = (r: TaskRow) => r.project;

  const uberSpans = useMemo(
    () => computeGroupSpans(data, uberAccessor),
    [data]
  );

  const projectSpans = useMemo(
    () =>
      computeGroupSpans(
        data,
        projectAccessor,
        (r) => r.project_color,
        (r) => ({ tickle: r.tickle_date, notes: r.project_notes }),
        [uberAccessor]
      ),
    [data]
  );

  const uberStartSet = new Set(uberSpans.map((s) => s.startIndex));
  const projectStartSet = new Set(projectSpans.map((s) => s.startIndex));
  const uberByIndex = Object.fromEntries(uberSpans.map((s) => [s.startIndex, s]));
  const projectByIndex = Object.fromEntries(projectSpans.map((s) => [s.startIndex, s]));

  return (
    <PageShell title="Grid" count={data.length} maxWidth="">
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        Active projects &middot; grouped by Uber Project &rarr; Project &middot;{" "}
        <span className="opacity-70">click any field to edit</span>
      </p>
      <div className="overflow-x-auto">
        <table
          className="w-full text-[length:var(--cell-font-size)]"
          style={{ tableLayout: "fixed", borderCollapse: "separate", borderSpacing: "var(--row-gap)" }}
        >
          <colgroup>
            <col style={{ width: 140 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 280 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 220 }} />
          </colgroup>
          <thead>
            <tr>
              {["Uber Project", "Project", "Task", "Task Status", "Tickle", "Result", "Notes"].map((h) => (
                <th
                  key={h}
                  className="text-left text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id}>
                {/* Icicle: Uber Project */}
                {uberStartSet.has(i) && (() => {
                  const span = uberByIndex[i];
                  return (
                    <td
                      rowSpan={span.rowSpan}
                      className="align-top px-3 py-2"
                      style={{ backgroundColor: "hsl(30, 20%, 45%)", color: "#ffffff" }}
                    >
                      <EditableText
                        value={span.value}
                        onSave={(v) =>
                          updateUberField(row.uber_project_id, "name", v)
                        }
                      />
                    </td>
                  );
                })()}

                {/* Icicle: Project (colored by status) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  const bg = span.color || "hsl(0, 0%, 45%)";
                  return (
                    <td
                      rowSpan={span.rowSpan}
                      className="align-top px-3 py-2"
                      style={{ backgroundColor: bg, color: "#ffffff" }}
                    >
                      <EditableText
                        value={span.value}
                        onSave={(v) =>
                          updateProjectField(row.project_id, "name", v)
                        }
                      />
                      <div className="text-xs mt-1 opacity-75">
                        <EditableText
                          value={(span.extra?.tickle as string) ?? ""}
                          placeholder="YYYY-MM-DD"
                          onSave={(v) =>
                            updateProjectField(
                              row.project_id,
                              "tickle_date",
                              v || null
                            )
                          }
                        />
                      </div>
                    </td>
                  );
                })()}

                {/* Task */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  <EditableText
                    value={row.task}
                    onSave={(v) => updateTaskField(row.id, "name", v)}
                  />
                </td>

                {/* Task Status (colored cell with select) */}
                <td
                  className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)]"
                  style={{ backgroundColor: row.task_color, color: "#ffffff" }}
                >
                  <EditableSelect
                    value={row.task_status_id}
                    options={taskStatuses}
                    onSave={(v) =>
                      updateTaskField(row.id, "status_id", v)
                    }
                  />
                </td>

                {/* Tickle Date (project-level, edits all rows of this project) */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm">
                  <EditableText
                    value={row.tickle_date ?? ""}
                    placeholder="YYYY-MM-DD"
                    onSave={(v) =>
                      updateProjectField(
                        row.project_id,
                        "tickle_date",
                        v || null
                      )
                    }
                  />
                </td>

                {/* Result */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  <EditableText
                    value={row.result ?? ""}
                    onSave={(v) =>
                      updateTaskField(row.id, "result", v || null)
                    }
                  />
                </td>

                {/* Notes */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  <EditableText
                    value={row.task_notes ?? ""}
                    onSave={(v) =>
                      updateTaskField(row.id, "notes", v || null)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

function EditableText({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void | Promise<void>;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  const [isPending, startTransition] = useTransition();
  useEffect(() => setV(value), [value]);
  return (
    <input
      type="text"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) {
          startTransition(() => {
            onSave(v);
          });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setV(value);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      style={{
        background: "transparent",
        color: "inherit",
        border: 0,
        padding: 0,
        font: "inherit",
        width: "100%",
        outline: "none",
        opacity: isPending ? 0.6 : 1,
      }}
    />
  );
}

function EditableSelect({
  value,
  options,
  onSave,
}: {
  value: string;
  options: StatusOption[];
  onSave: (v: string) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      value={value}
      onChange={(e) => {
        startTransition(() => {
          onSave(e.target.value);
        });
      }}
      style={{
        background: "transparent",
        color: "inherit",
        border: 0,
        padding: 0,
        font: "inherit",
        width: "100%",
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {options.map((o) => (
        <option
          key={o.id}
          value={o.id}
          style={{ color: "#000", background: "#fff" }}
        >
          {o.name}
        </option>
      ))}
    </select>
  );
}
