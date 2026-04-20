"use client";

import { useMemo, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { useTableViews, resolveColumnOrder } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { RowContextMenu } from "@/components/row-context-menu";
import type { ExpandOnGroupConfig } from "@/lib/table-grouping";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "center" | "right";
  width?: number;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Whether this column can be used as a grouping field. */
  groupable?: boolean;
  /**
   * When set, grouping by this column expands rows: a record with N values
   * in this column renders once per value, under each group header. Records
   * with no values land in a synthetic "Uncategorized" bucket.
   */
  expandOnGroup?: ExpandOnGroupConfig;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
  fixedLayout?: boolean;
  storageKey?: string;
  viewSwitcherFootnote?: React.ReactNode;
  onAddRow?: () => void | Promise<void>;
  addRowLabel?: string;
  onAddTopRow?: () => void | Promise<void>;
  addTopRowLabel?: string;
  rowStyle?: (row: T) => React.CSSProperties | undefined;
  onDeleteRow?: (row: T) => void | Promise<void>;
  deleteItemLabel?: string | ((row: T) => string);
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
  onAddTopRow,
  addTopRowLabel = "+ Add new",
  rowStyle,
  onDeleteRow,
  deleteItemLabel,
}: DataTableProps<T>) {
  const [addPending, startAddTransition] = useTransition();
  const [addTopPending, startAddTopTransition] = useTransition();
  const defaultWidths: Record<string, number> = {};
  for (const col of columns) {
    if (col.width !== undefined) defaultWidths[col.key] = col.width;
  }

  const views = useTableViews(storageKey ?? "__datatable_unused__", defaultWidths);
  const enabled = !!storageKey;

  const orderedColumns = useMemo(() => {
    if (!enabled) return columns;
    const keys = resolveColumnOrder(
      views.params.columnOrder,
      columns.map((c) => c.key),
    );
    const byKey = new Map(columns.map((c) => [c.key, c]));
    return keys
      .map((k) => byKey.get(k))
      .filter((c): c is Column<T> => c != null);
  }, [columns, enabled, views.params.columnOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const keys = orderedColumns.map((c) => c.key);
    const oldIndex = keys.indexOf(String(active.id));
    const newIndex = keys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    views.setColumnOrder(arrayMove(keys, oldIndex, newIndex));
  };

  const getWidth = (col: Column<T>): number | undefined => {
    if (enabled) return views.params.columnWidths[col.key] ?? col.width;
    return col.width;
  };

  const alignFor = (col: Column<T>) =>
    col.align === "center"
      ? "text-center"
      : col.align === "right"
        ? "text-right"
        : "text-left";

  const totalWidth = enabled
    ? orderedColumns.reduce((sum, c) => sum + (getWidth(c) ?? 0), 0)
    : undefined;

  const sortableIds = orderedColumns.map((c) => c.key);

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table
          className="text-[length:var(--cell-font-size)] [&_td]:align-top"
          style={{
            tableLayout: fixedLayout ? "fixed" : undefined,
            borderCollapse: "separate",
            borderSpacing: "var(--row-gap)",
            width: totalWidth || undefined,
          }}
        >
          {orderedColumns.some((c) => c.width) && (
            <colgroup>
              {orderedColumns.map((col) => {
                const w = getWidth(col);
                return (
                  <col key={col.key} style={w ? { width: w } : undefined} />
                );
              })}
            </colgroup>
          )}
          <thead>
            <tr>
              <SortableContext
                items={sortableIds}
                strategy={horizontalListSortingStrategy}
              >
                {orderedColumns.map((col, i) => (
                  <SortableHeaderCell
                    key={col.key}
                    id={col.key}
                    enableDrag={enabled}
                    style={{ position: enabled ? "relative" : undefined }}
                    className={cn(
                      "px-[var(--header-padding-x)] py-[var(--header-padding-y)]",
                      "text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)]",
                      "bg-[color:var(--header-bg)] text-[color:var(--header-color)]",
                      alignFor(col),
                    )}
                    extras={
                      enabled && (
                        <ColumnResizer
                          columnIndex={i}
                          currentWidth={getWidth(col) ?? 100}
                          onResize={(w) => views.setColumnWidth(col.key, w)}
                        />
                      )
                    }
                  >
                    {col.header}
                  </SortableHeaderCell>
                ))}
              </SortableContext>
            </tr>
          </thead>
          <tbody>
            <tr aria-hidden="true">
              <td
                colSpan={orderedColumns.length}
                style={{ height: 14, padding: 0, background: "transparent" }}
              />
            </tr>
            {onAddTopRow && (
              <>
                <tr>
                  <td
                    colSpan={orderedColumns.length}
                    className="themed-new-row-cell"
                    onClick={() => {
                      if (!addTopPending)
                        startAddTopTransition(() => onAddTopRow());
                    }}
                    title="Add a new record"
                  >
                    {addTopPending ? "Adding…" : addTopRowLabel}
                  </td>
                </tr>
                <tr aria-hidden="true">
                  <td
                    colSpan={orderedColumns.length}
                    style={{ height: 14, padding: 0, background: "transparent" }}
                  />
                </tr>
              </>
            )}
            {rows.map((row) => {
              const record = row as Record<string, unknown>;
              const cells = orderedColumns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)]",
                    "bg-[color:var(--cell-bg)]",
                    alignFor(col),
                    col.className,
                  )}
                >
                  {col.render
                    ? col.render(row)
                    : String(record[col.key] ?? "")}
                </td>
              ));
              if (onDeleteRow) {
                const label =
                  typeof deleteItemLabel === "function"
                    ? deleteItemLabel(row)
                    : deleteItemLabel;
                return (
                  <RowContextMenu
                    key={rowKey(row)}
                    rowStyle={rowStyle?.(row)}
                    onDelete={() => onDeleteRow(row)}
                    itemLabel={label}
                  >
                    {cells}
                  </RowContextMenu>
                );
              }
              return (
                <tr key={rowKey(row)} style={rowStyle?.(row)}>
                  {cells}
                </tr>
              );
            })}
            {onAddRow && (
              <tr>
                <td
                  colSpan={orderedColumns.length}
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
      </DndContext>
    </div>
  );
}
