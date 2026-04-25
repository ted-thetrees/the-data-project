"use client";

import { Fragment, useMemo, useTransition } from "react";
import { EditableText, EditableNumber } from "@/components/editable-text";
import { RowContextMenu } from "@/components/row-context-menu";
import { ColumnResizer } from "@/components/column-resizer";
import { useTableViews, type ViewParams } from "@/components/table-views";
import { CALORIES_STORAGE_KEY, CALORIES_DEFAULT_WIDTHS } from "./config";
import {
  createLogEntry,
  updateLogItem,
  updateLogAmount,
  updateLogCalories,
  deleteLogEntry,
} from "./actions";

const COLUMN_KEYS = ["date", "item", "amount", "calories", "running", "remaining"] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];

export interface LogRow {
  id: string;
  item: string;
  amount: string;
  calories: number;
  food_name: string | null;
  logged_on: string; // 'YYYY-MM-DD' (date already grouped — no TZ conversion)
  created_at: string;
}

interface DayGroup {
  loggedOn: string;
  label: string;
  rows: Array<LogRow & { running: number; remaining: number }>;
  total: number;
}

function formatDateLabel(loggedOn: string): string {
  // loggedOn is 'YYYY-MM-DD' from Postgres to_char — parse as local date
  // (not UTC) so "today" matches the user's local day.
  const [y, m, d] = loggedOn.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === yest.getTime()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function buildGroups(log: LogRow[], allowance: number): DayGroup[] {
  const byDay = new Map<string, LogRow[]>();
  for (const row of log) {
    const list = byDay.get(row.logged_on) ?? [];
    list.push(row);
    byDay.set(row.logged_on, list);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => (a < b ? 1 : -1));
  return days.map((loggedOn) => {
    const dayRows = (byDay.get(loggedOn) ?? []).slice().sort((a, b) =>
      a.created_at < b.created_at ? -1 : 1,
    );
    let running = 0;
    const rows = dayRows.map((r) => {
      running += r.calories;
      return { ...r, running, remaining: allowance - running };
    });
    return {
      loggedOn,
      label: formatDateLabel(loggedOn),
      rows,
      total: running,
    };
  });
}

export function CaloriesClient({
  log,
  allowance,
  initialParams,
}: {
  log: LogRow[];
  allowance: number;
  initialParams?: ViewParams;
}) {
  const groups = useMemo(() => buildGroups(log, allowance), [log, allowance]);

  const { params, setColumnWidth } = useTableViews(
    CALORIES_STORAGE_KEY,
    CALORIES_DEFAULT_WIDTHS,
    initialParams,
  );

  const widthOf = (key: ColumnKey) =>
    params.columnWidths[key] ?? CALORIES_DEFAULT_WIDTHS[key];

  const totalWidth = COLUMN_KEYS.reduce((sum, k) => sum + widthOf(k), 0);

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] font-[number:var(--header-font-weight)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] align-top";

  const HEADER_LABELS: Record<ColumnKey, string> = {
    date: "Date",
    item: "Item",
    amount: "Amount",
    calories: "Calories",
    running: "Running",
    remaining: "Remaining",
  };
  const RIGHT_ALIGNED: Record<ColumnKey, boolean> = {
    date: false,
    item: false,
    amount: true,
    calories: true,
    running: true,
    remaining: true,
  };

  return (
    <div className="overflow-x-auto">
      <table
        className="text-[length:var(--cell-font-size)]"
        style={{
          tableLayout: "fixed",
          borderCollapse: "separate",
          borderSpacing: "var(--row-gap)",
          width: totalWidth,
        }}
      >
        <colgroup>
          {COLUMN_KEYS.map((key) => (
            <col key={key} style={{ width: widthOf(key) }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMN_KEYS.map((key, i) => (
              <th
                key={key}
                className={`${headerClass} ${RIGHT_ALIGNED[key] ? "text-right" : ""}`}
              >
                {HEADER_LABELS[key]}
                <ColumnResizer
                  columnIndex={i}
                  currentWidth={widthOf(key)}
                  onResize={(w) => setColumnWidth(key, w)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr aria-hidden="true">
            <td colSpan={6} style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }} />
          </tr>
          <NewEntryRow loggedOn={null} colSpan={6} label="+ New entry (today)" />
          <tr aria-hidden="true">
            <td colSpan={6} style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }} />
          </tr>

          {groups.map((group) => (
            <Fragment key={group.loggedOn}>
              {group.rows.map((row, i) => {
                const over = row.remaining < 0;
                return (
                  <RowContextMenu
                    key={row.id}
                    onDelete={() => deleteLogEntry(row.id)}
                    itemLabel={row.item ? `"${row.item}"` : "this entry"}
                  >
                    {i === 0 && (
                      <td
                        rowSpan={group.rows.length + 1}
                        className={`${cellClass} font-[number:var(--font-weight-medium)]`}
                      >
                        <div>{group.label}</div>
                        <div className="text-[length:var(--font-size-xs)] text-[color:var(--muted-foreground)] mt-1">
                          {group.total.toLocaleString()} cal
                        </div>
                      </td>
                    )}
                    <td className={cellClass}>
                      <EditableText
                        value={row.item}
                        onSave={(v) => updateLogItem(row.id, v)}
                      />
                    </td>
                    <td className={`${cellClass} text-right`}>
                      <EditableText
                        value={row.amount}
                        onSave={(v) => updateLogAmount(row.id, v)}
                      />
                    </td>
                    <td className={`${cellClass} text-right`}>
                      <EditableNumber
                        value={row.calories}
                        onSave={(v) => updateLogCalories(row.id, v)}
                      />
                    </td>
                    <td className={`${cellClass} text-right tabular-nums`}>
                      {row.running.toLocaleString()}
                    </td>
                    <td
                      className={`${cellClass} text-right tabular-nums`}
                      style={{ color: over ? "var(--destructive)" : undefined }}
                    >
                      {row.remaining.toLocaleString()}
                    </td>
                  </RowContextMenu>
                );
              })}
              <AddRowInGroup loggedOn={group.loggedOn} />
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewEntryRow({
  loggedOn,
  colSpan,
  label,
}: {
  loggedOn: string | null;
  colSpan: number;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) {
            startTransition(() => createLogEntry(loggedOn ?? undefined));
          }
        }}
        title="Add a new entry"
      >
        {pending ? "Adding…" : label}
      </td>
    </tr>
  );
}

function AddRowInGroup({ loggedOn }: { loggedOn: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={5}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createLogEntry(loggedOn));
        }}
        title="Add an entry on this date"
      >
        {pending ? "Adding…" : "+ Add entry"}
      </td>
    </tr>
  );
}
