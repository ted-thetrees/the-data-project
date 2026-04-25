"use client";

import { Fragment, useMemo, useTransition } from "react";
import { EditableText, EditableNumber } from "@/components/editable-text";
import { RowContextMenu } from "@/components/row-context-menu";
import {
  createLogEntry,
  updateLogItem,
  updateLogAmount,
  updateLogCalories,
  deleteLogEntry,
} from "./actions";

export interface LogRow {
  id: string;
  item: string;
  amount: number;
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

const COLUMN_WIDTHS = {
  date: 180,
  item: 280,
  amount: 90,
  calories: 100,
  running: 110,
  remaining: 110,
} as const;

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
}: {
  log: LogRow[];
  allowance: number;
}) {
  const groups = useMemo(() => buildGroups(log, allowance), [log, allowance]);

  const totalWidth =
    COLUMN_WIDTHS.date +
    COLUMN_WIDTHS.item +
    COLUMN_WIDTHS.amount +
    COLUMN_WIDTHS.calories +
    COLUMN_WIDTHS.running +
    COLUMN_WIDTHS.remaining;

  const headerClass =
    "text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] font-[number:var(--header-font-weight)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] align-top";

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
          <col style={{ width: COLUMN_WIDTHS.date }} />
          <col style={{ width: COLUMN_WIDTHS.item }} />
          <col style={{ width: COLUMN_WIDTHS.amount }} />
          <col style={{ width: COLUMN_WIDTHS.calories }} />
          <col style={{ width: COLUMN_WIDTHS.running }} />
          <col style={{ width: COLUMN_WIDTHS.remaining }} />
        </colgroup>
        <thead>
          <tr>
            <th className={headerClass}>Date</th>
            <th className={headerClass}>Item</th>
            <th className={`${headerClass} text-right`}>Amount</th>
            <th className={`${headerClass} text-right`}>Calories</th>
            <th className={`${headerClass} text-right`}>Running</th>
            <th className={`${headerClass} text-right`}>Remaining</th>
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
                      <EditableNumber
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
