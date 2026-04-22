"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTableViews,
  resolveColumnOrder,
  type ViewParams,
} from "@/components/table-views";
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
  /**
   * Enables vertical row drag with a grip-handle column on the left.
   * Called with the new ordering of row keys after a drop.
   */
  onReorderRows?: (orderedKeys: string[]) => void | Promise<void>;
  /** Server-provided initial params (from cookies) to avoid SSR/hydration flicker. */
  initialParams?: ViewParams;
}

const GRIP_COLUMN_WIDTH = 24;

function DraggableRow({
  id,
  rowStyle,
  children,
}: {
  id: string;
  rowStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    ...rowStyle,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : rowStyle?.opacity,
    position: isDragging ? "relative" : rowStyle?.position,
    zIndex: isDragging ? 2 : rowStyle?.zIndex,
  };
  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td
        {...listeners}
        className="cursor-grab select-none bg-[color:var(--cell-bg)] text-[color:var(--muted-foreground)] align-middle"
        style={{
          width: GRIP_COLUMN_WIDTH,
          padding: 0,
          textAlign: "center",
          touchAction: "none",
        }}
        title="Drag to reorder"
      >
        <GripVertical className="inline-block w-3 h-3 opacity-60 hover:opacity-100" />
      </td>
      {children}
    </tr>
  );
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
  onReorderRows,
  initialParams,
}: DataTableProps<T>) {
  const [addPending, startAddTransition] = useTransition();
  const [addTopPending, startAddTopTransition] = useTransition();
  const defaultWidths: Record<string, number> = {};
  for (const col of columns) {
    if (col.width !== undefined) defaultWidths[col.key] = col.width;
  }

  const views = useTableViews(
    storageKey ?? "__datatable_unused__",
    defaultWidths,
    initialParams,
  );
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

  const hasRowReorder = Boolean(onReorderRows);
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);
  useEffect(() => {
    setOptimisticOrder(null);
  }, [rows]);

  const displayRows = useMemo(() => {
    if (!optimisticOrder) return rows;
    const byKey = new Map(rows.map((r) => [rowKey(r), r]));
    const ordered = optimisticOrder
      .map((k) => byKey.get(k))
      .filter((r): r is T => r != null);
    const seen = new Set(optimisticOrder);
    for (const r of rows) {
      if (!seen.has(rowKey(r))) ordered.push(r);
    }
    return ordered;
  }, [rows, optimisticOrder, rowKey]);

  const rowKeys = displayRows.map(rowKey);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const columnKeys = orderedColumns.map((c) => c.key);
    if (columnKeys.includes(activeId)) {
      const oldIndex = columnKeys.indexOf(activeId);
      const newIndex = columnKeys.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;
      views.setColumnOrder(arrayMove(columnKeys, oldIndex, newIndex));
      return;
    }

    if (hasRowReorder && rowKeys.includes(activeId)) {
      const oldIndex = rowKeys.indexOf(activeId);
      const newIndex = rowKeys.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(rowKeys, oldIndex, newIndex);
      setOptimisticOrder(reordered);
      void onReorderRows?.(reordered);
    }
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

  const userColsWidth = enabled
    ? orderedColumns.reduce((sum, c) => sum + (getWidth(c) ?? 0), 0)
    : 0;
  // Only pin a table width when user columns actually have saved widths —
  // otherwise adding the grip width alone would shrink the table to 24px and
  // force table-layout:auto to squeeze the rest of the columns.
  const totalWidth =
    enabled && userColsWidth > 0
      ? userColsWidth + (hasRowReorder ? GRIP_COLUMN_WIDTH : 0)
      : undefined;

  const sortableIds = orderedColumns.map((c) => c.key);
  const totalColumnCount =
    orderedColumns.length + (hasRowReorder ? 1 : 0);

  const tableRef = useRef<HTMLTableElement>(null);

  const snapshotMissingWidths = () => {
    if (!enabled) return;
    const tableEl = tableRef.current;
    if (!tableEl) return;
    const colEls = tableEl.querySelectorAll("col");
    const gripOffset = hasRowReorder ? 1 : 0;
    const updates: Record<string, number> = {};
    orderedColumns.forEach((c, idx) => {
      if (getWidth(c) !== undefined) return;
      const el = colEls[idx + gripOffset] as
        | HTMLTableColElement
        | undefined;
      if (el && el.offsetWidth > 0) updates[c.key] = el.offsetWidth;
    });
    views.setColumnWidths(updates);
  };

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
          ref={tableRef}
          className="text-[length:var(--cell-font-size)] [&_td]:align-top"
          style={{
            tableLayout: fixedLayout ? "fixed" : undefined,
            borderCollapse: "separate",
            borderSpacing: "var(--row-gap)",
            width: totalWidth || undefined,
          }}
        >
          {(hasRowReorder || orderedColumns.some((c) => c.width)) && (
            <colgroup>
              {hasRowReorder && (
                <col style={{ width: GRIP_COLUMN_WIDTH }} />
              )}
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
              {hasRowReorder && (
                <th
                  aria-hidden="true"
                  className="bg-[color:var(--header-bg)]"
                  style={{ width: GRIP_COLUMN_WIDTH }}
                />
              )}
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
                          columnIndex={i + (hasRowReorder ? 1 : 0)}
                          currentWidth={getWidth(col) ?? 100}
                          onResizeStart={snapshotMissingWidths}
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
                colSpan={totalColumnCount}
                style={{ height: 14, padding: 0, background: "transparent" }}
              />
            </tr>
            {onAddTopRow && (
              <>
                <tr>
                  <td
                    colSpan={totalColumnCount}
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
            <SortableContext
              items={rowKeys}
              strategy={verticalListSortingStrategy}
              disabled={!hasRowReorder}
            >
              {displayRows.map((row) => {
                const record = row as Record<string, unknown>;
                const key = rowKey(row);
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
                if (hasRowReorder) {
                  return (
                    <DraggableRow
                      key={key}
                      id={key}
                      rowStyle={rowStyle?.(row)}
                    >
                      {cells}
                    </DraggableRow>
                  );
                }
                if (onDeleteRow) {
                  const label =
                    typeof deleteItemLabel === "function"
                      ? deleteItemLabel(row)
                      : deleteItemLabel;
                  return (
                    <RowContextMenu
                      key={key}
                      rowStyle={rowStyle?.(row)}
                      onDelete={() => onDeleteRow(row)}
                      itemLabel={label}
                    >
                      {cells}
                    </RowContextMenu>
                  );
                }
                return (
                  <tr key={key} style={rowStyle?.(row)}>
                    {cells}
                  </tr>
                );
              })}
            </SortableContext>
            {onAddRow && (
              <tr>
                <td
                  colSpan={totalColumnCount}
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
