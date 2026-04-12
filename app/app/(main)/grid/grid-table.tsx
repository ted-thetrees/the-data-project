"use client";

import { useMemo } from "react";
import { PageShell } from "@/components/page-shell";
import type { TaskRow } from "./page";

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

function Empty() {
  return <span className="text-zinc-300">—</span>;
}

export function GridTable({ data }: { data: TaskRow[] }) {
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
        Active projects &middot; grouped by Uber Project &rarr; Project
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
                      <span className="text-sm leading-snug whitespace-nowrap">{span.value}</span>
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
                      <span className="text-sm leading-snug">{span.value}</span>
                      {span.extra?.tickle ? (
                        <div className="text-xs mt-1 opacity-75">
                          {String(span.extra.tickle)}
                        </div>
                      ) : null}
                    </td>
                  );
                })()}

                {/* Task */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  {row.task}
                </td>

                {/* Task Status (colored cell) */}
                <td
                  className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)]"
                  style={{ backgroundColor: row.task_color, color: "#ffffff" }}
                >
                  <span className="text-sm leading-snug whitespace-nowrap">{row.task_status}</span>
                </td>

                {/* Tickle Date */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm">
                  {row.tickle_date || <Empty />}
                </td>

                {/* Result */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  {row.result ? (
                    <span className="text-zinc-500 truncate block" title={row.result}>{row.result}</span>
                  ) : (
                    <Empty />
                  )}
                </td>

                {/* Notes */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  {row.task_notes ? (
                    <span className="text-zinc-500 truncate block" title={row.task_notes}>{row.task_notes}</span>
                  ) : (
                    <Empty />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
