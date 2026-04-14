"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { useTableViews } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: number;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
  fixedLayout?: boolean;
  /**
   * When provided, enables column resize + saved views persisted under this key.
   * Defaults come from each Column.width.
   */
  storageKey?: string;
  viewSwitcherFootnote?: React.ReactNode;
  /**
   * When provided, renders a faded dashed `+ Add` row at the bottom of the table.
   * Click the row to invoke the handler. The standard pattern is to insert a
   * placeholder record and let the user edit it via inline cell editors.
   */
  onAddRow?: () => void | Promise<void>;
  addRowLabel?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  className,
  fixedLayout,
  storageKey,
  viewSwitcherFootnote,
  onAddRow,
  addRowLabel = "+ Add row",
}: DataTableProps<T>) {
  const [addPending, startAddTransition] = useTransition();
  const defaultWidths: Record<string, number> = {};
  for (const col of columns) {
    if (col.width !== undefined) defaultWidths[col.key] = col.width;
  }

  // Always call the hook (React rules); when storageKey is missing we use a
  // stable sentinel and ignore the results.
  const views = useTableViews(storageKey ?? "__datatable_unused__", defaultWidths);
  const enabled = !!storageKey;

  const getWidth = (col: Column<T>): number | undefined => {
    if (enabled) return views.params.columnWidths[col.key] ?? col.width;
    return col.width;
  };

  const totalWidth = enabled
    ? columns.reduce((sum, c) => sum + (getWidth(c) ?? 0), 0)
    : undefined;

  return (
    <div className={cn("overflow-x-auto", className)}>
      {enabled && (
        <ViewSwitcher
          views={views.views}
          activeViewId={views.activeViewId}
          onSwitch={views.switchView}
          onCreate={views.createView}
          onRename={views.renameView}
          onDelete={views.deleteView}
        >
          {viewSwitcherFootnote}
        </ViewSwitcher>
      )}
      <table
        className="text-[length:var(--cell-font-size)] [&_td]:align-top"
        style={{
          tableLayout: fixedLayout ? "fixed" : undefined,
          borderCollapse: "separate",
          borderSpacing: "var(--row-gap)",
          width: totalWidth || undefined,
        }}
      >
        {columns.some((c) => c.width) && (
          <colgroup>
            {columns.map((col) => {
              const w = getWidth(col);
              return (
                <col key={col.key} style={w ? { width: w } : undefined} />
              );
            })}
          </colgroup>
        )}
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key}
                style={{ position: enabled ? "relative" : undefined }}
                className={cn(
                  "px-[var(--header-padding-x)] py-[var(--header-padding-y)]",
                  "text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)]",
                  "bg-[color:var(--header-bg)] text-[color:var(--header-color)]",
                  col.align === "center"
                    ? "text-center"
                    : col.align === "right"
                      ? "text-right"
                      : "text-left",
                )}
              >
                {col.header}
                {enabled && (
                  <ColumnResizer
                    columnIndex={i}
                    currentWidth={getWidth(col) ?? 100}
                    onResize={(w) => views.setColumnWidth(col.key, w)}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr aria-hidden="true">
            <td
              colSpan={columns.length}
              style={{ height: 14, padding: 0, background: "transparent" }}
            />
          </tr>
          {rows.map((row) => {
            const record = row as Record<string, unknown>;
            return (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)]",
                      "bg-[color:var(--cell-bg)]",
                      col.align === "center"
                        ? "text-center"
                        : col.align === "right"
                          ? "text-right"
                          : "text-left",
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String(record[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
          {onAddRow && (
            <tr>
              <td
                colSpan={columns.length}
                className="themed-new-row-cell"
                onClick={() => {
                  if (!addPending) startAddTransition(() => onAddRow());
                }}
                title="Add a new row"
              >
                {addPending ? "Adding…" : addRowLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
