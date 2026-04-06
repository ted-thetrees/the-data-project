"use client";

import { useContext, useState, useRef, useCallback } from "react";
import type { Row } from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { useDataTable } from "@/components/niko-table/core/data-table-context";
import { ColContext, ColResizer } from "./col-context";
import { EditableText, EditableSelect, ImageCell } from "./editable-cells";
import { RovingTabIndexProvider, GridCellNav } from "./grid-cell-nav";
import { NewRow } from "./new-row";
import { depthColor, INDENT_PX, GAP_PX, ROW_HEIGHT, contrastText } from "./styles";
import { applyColumnFilters } from "./column-filters";
import type { ColConfig, ColumnFilter } from "./types";

// --- Column headers ---

export function FlexColumnHeaders({ indent, visibleCols }: { indent: number; visibleCols: ColConfig[] }) {
  const { widths } = useContext(ColContext);
  return (
    <div style={{
      display: "flex", alignItems: "stretch", marginLeft: indent, gap: GAP_PX,
      fontSize: "var(--header-font-size)", fontWeight: "var(--header-font-weight)" as unknown as number,
      textTransform: "var(--header-text-transform)" as React.CSSProperties["textTransform"],
      letterSpacing: "var(--header-letter-spacing)",
      color: "var(--header-color)",
    }}>
      {visibleCols.map((col, i) => {
        const isImage = col.type === "image";
        const colWidth = isImage ? ROW_HEIGHT : widths[i];
        return (
          <div key={col.key} style={{
            ...(i < visibleCols.length - 1 ? { width: colWidth, flexShrink: 0 } : { flex: 1, minWidth: colWidth }),
            position: "relative", padding: `var(--header-padding-y) var(--header-padding-x)`,
            background: "var(--header-bg)",
            ...(isImage ? { display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" } : {}),
          }}>
            {isImage ? <span style={{ fontSize: "var(--font-size-lg)", lineHeight: 1 }}>👤</span> : col.label}
            {i < visibleCols.length - 1 && !isImage && <ColResizer index={i} />}
          </div>
        );
      })}
    </div>
  );
}

// --- Data row ---

export type PicklistColorMap = { [fieldKey: string]: { [optionValue: string]: string } };

export function FlexDataRow<T extends { id: string }>({
  row, visibleCols, depth, onUpdate, picklistColors, rowIndex,
}: {
  row: Row<T>;
  visibleCols: ColConfig[];
  depth: number;
  onUpdate: (recordId: string, field: string, value: string) => void;
  picklistColors?: PicklistColorMap;
  rowIndex?: number;
}) {
  const { widths } = useContext(ColContext);
  const indent = depth * INDENT_PX;
  const bg = depthColor(depth);

  return (
    <div style={{ display: "flex", alignItems: "stretch", marginLeft: indent, gap: GAP_PX, height: ROW_HEIGHT }}>
      {visibleCols.map((col, i) => {
        const isLast = i === visibleCols.length - 1;
        const val = (row.original as Record<string, unknown>)[col.key];
        const optionColor = col.type === "select" && val ? picklistColors?.[col.label]?.[(val as string)] : undefined;
        const cellBg = optionColor || bg;
        const colWidth = col.type === "image" ? ROW_HEIGHT : widths[i];
        const cellStyle: React.CSSProperties = {
          background: cellBg,
          ...(optionColor ? { color: contrastText(optionColor) } : {}),
          ...(isLast ? { flex: 1, minWidth: colWidth } : { width: colWidth, flexShrink: 0 }),
          position: "relative",
          ...(col.fontWeight ? { fontWeight: col.fontWeight } : {}),
          ...(col.type === "image" ? { padding: 0, overflow: "hidden" } : {}),
        };

        const cellContent = (
          <>
            {col.render ? (
              col.render(val, row.original as Record<string, unknown>)
            ) : col.type === "image" ? (
              <ImageCell value={val} />
            ) : col.type === "date" ? (
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--muted-foreground)" }}>
                {val ? new Date(val as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
              </span>
            ) : col.type === "text" ? (
              <EditableText
                value={(val as string) || ""}
                onSave={(v) => onUpdate(row.original.id, col.key, v)}
              />
            ) : (
              <EditableSelect
                value={val as string | null}
                options={col.options || []}
                onSave={(v) => onUpdate(row.original.id, col.key, v)}
                optionColors={picklistColors?.[col.label]}
              />
            )}
            {!isLast && <ColResizer index={i} />}
          </>
        );

        return rowIndex !== undefined ? (
          <GridCellNav key={col.key} rowIndex={rowIndex} className="gt-cell" style={cellStyle}>
            {cellContent}
          </GridCellNav>
        ) : (
          <div key={col.key} className="gt-cell" style={cellStyle}>
            {cellContent}
          </div>
        );
      })}
    </div>
  );
}

// --- Group header ---

export function GroupHeader({ label, count, open, onToggle, depth }: {
  label: string; count: number; open: boolean; onToggle: () => void; depth: number;
}) {
  const indent = depth * INDENT_PX;
  const bg = depthColor(depth);
  return (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 10,
      marginLeft: indent, padding: `var(--group-header-padding-y) var(--group-header-padding-x)`,
      cursor: "pointer", background: bg,
      marginTop: depth > 0 ? GAP_PX : 0,
      fontWeight: "var(--group-header-font-weight)" as unknown as number,
      fontSize: 14 - depth,
    }}>
      <span style={{ color: "var(--muted-foreground)", fontSize: "var(--font-size-sm)" }}>{open ? "▾" : "▸"}</span>
      <span>{label || "—"}</span>
      <span style={{
        fontSize: "var(--group-count-font-size)",
        color: "var(--muted-foreground)",
        background: "var(--group-count-bg)",
        borderRadius: "var(--group-count-radius)",
        padding: "var(--group-count-padding)",
      }}>{count}</span>
    </div>
  );
}

// --- Nested groups ---

/** Count total visible rows in a group tree (for computing startIndex offsets). */
function countVisibleRows<T extends { id: string }>(
  rows: Row<T>[], groupFields: string[], groupSortDirs: ("asc" | "desc")[], openGroups: Set<string>, depth: number,
): number {
  if (groupFields.length === 0) return rows.length;
  const [currentField, ...remainingFields] = groupFields;
  const [currentSortDir, ...remainingSortDirs] = groupSortDirs;
  const map = new Map<string, Row<T>[]>();
  for (const row of rows) {
    const key = ((row.original as Record<string, unknown>)[currentField] as string) || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  let total = 0;
  for (const [label, members] of map) {
    const groupKey = `${depth}-${currentField}-${label}`;
    if (openGroups.has(groupKey)) {
      total += countVisibleRows(members, remainingFields, remainingSortDirs, openGroups, depth + 1);
    }
  }
  return total;
}

export function NestedGroups<T extends { id: string }>({
  rows, visibleCols, groupFields, groupSortDirs, depth, openGroups, toggleGroup, onUpdate, showHeaders, picklistColors, onCreate, startIndex = 0,
}: {
  rows: Row<T>[];
  visibleCols: ColConfig[];
  groupFields: string[];
  groupSortDirs: ("asc" | "desc")[];
  depth: number;
  openGroups: Set<string>;
  toggleGroup: (key: string) => void;
  onUpdate: (recordId: string, field: string, value: string) => void;
  showHeaders?: boolean;
  picklistColors?: PicklistColorMap;
  onCreate?: (fields: Record<string, string>) => Promise<void>;
  startIndex?: number;
}) {
  if (groupFields.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: GAP_PX, marginTop: GAP_PX }}>
        {showHeaders && <FlexColumnHeaders indent={depth * INDENT_PX} visibleCols={visibleCols} />}
        {rows.map((row, i) => (
          <FlexDataRow key={row.id} row={row} visibleCols={visibleCols} depth={depth} onUpdate={onUpdate} picklistColors={picklistColors} rowIndex={startIndex + i} />
        ))}
        {onCreate && <NewRow visibleCols={visibleCols} depth={depth} onCreate={onCreate} />}
      </div>
    );
  }

  const [currentField, ...remainingFields] = groupFields;
  const [currentSortDir, ...remainingSortDirs] = groupSortDirs;
  const map = new Map<string, Row<T>[]>();
  for (const row of rows) {
    const key = ((row.original as Record<string, unknown>)[currentField] as string) || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const sortedEntries = [...map.entries()].sort(([a], [b]) => {
    const cmp = a.localeCompare(b);
    return currentSortDir === "asc" ? cmp : -cmp;
  });

  let runningIndex = startIndex;
  return (
    <>
      {sortedEntries.map(([label, members]) => {
        const groupKey = `${depth}-${currentField}-${label}`;
        const isOpen = openGroups.has(groupKey);
        const isLeafGroup = remainingFields.length === 0;
        const myStartIndex = runningIndex;
        if (isOpen) {
          runningIndex += countVisibleRows(members, remainingFields, remainingSortDirs, openGroups, depth + 1);
        }
        return (
          <div key={groupKey}>
            <GroupHeader label={label} count={members.length} open={isOpen}
              onToggle={() => toggleGroup(groupKey)} depth={depth} />
            {isOpen && (
              <NestedGroups rows={members} visibleCols={visibleCols} groupFields={remainingFields}
                groupSortDirs={remainingSortDirs} depth={depth + 1} openGroups={openGroups}
                toggleGroup={toggleGroup} onUpdate={onUpdate} showHeaders={isLeafGroup} picklistColors={picklistColors} onCreate={onCreate}
                startIndex={myStartIndex} />
            )}
          </div>
        );
      })}
    </>
  );
}

// --- Draggable row wrapper ---

function DraggableRow<T extends { id: string }>({
  row, visibleCols, onUpdate, picklistColors, rowIndex,
  draggedId, dropIndex, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  row: Row<T>;
  visibleCols: ColConfig[];
  onUpdate: (recordId: string, field: string, value: string) => void;
  picklistColors?: PicklistColorMap;
  rowIndex: number;
  draggedId: string | null;
  dropIndex: number | null;
  onDragStart: (id: string, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const isDragged = draggedId === row.original.id;
  const showDropBefore = dropIndex === rowIndex && draggedId !== null && !isDragged;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", row.original.id);
        onDragStart(row.original.id, rowIndex);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(e, rowIndex);
      }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      style={{
        cursor: "grab",
        opacity: isDragged ? 0.4 : 1,
        position: "relative",
      }}
    >
      {showDropBefore && (
        <div style={{
          position: "absolute", top: -1, left: 0, right: 0, height: 2,
          background: "var(--primary)", zIndex: 20,
        }} />
      )}
      <FlexDataRow
        row={row} visibleCols={visibleCols} depth={0}
        onUpdate={onUpdate} picklistColors={picklistColors} rowIndex={rowIndex}
      />
    </div>
  );
}

// --- Main flex body (reads from Niko Table context) ---

export function FlexBody<T extends { id: string }>({
  visibleCols, groupFields, groupSortDirs, openGroups, toggleGroup, onUpdate, picklistColors, onCreate,
  sorting, rowOrder, onReorder, columnFilters,
}: {
  visibleCols: ColConfig[];
  groupFields: string[];
  groupSortDirs: ("asc" | "desc")[];
  openGroups: Set<string>;
  toggleGroup: (key: string) => void;
  onUpdate: (recordId: string, field: string, value: string) => void;
  picklistColors?: PicklistColorMap;
  onCreate?: (fields: Record<string, string>) => Promise<void>;
  sorting?: SortingState;
  rowOrder?: string[];
  onReorder?: (order: string[]) => void;
  columnFilters?: Record<string, ColumnFilter>;
}) {
  const { table } = useDataTable<T>();
  let allRows = table.getRowModel().rows;

  // Apply column filters
  if (columnFilters && Object.keys(columnFilters).length > 0) {
    const filtered = applyColumnFilters(
      allRows.map((r) => r.original as Record<string, unknown>),
      columnFilters,
    );
    const filteredIds = new Set(filtered.map((r) => (r as { id: string }).id));
    allRows = allRows.filter((r) => filteredIds.has(r.original.id));
  }

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragSourceIndex = useRef<number | null>(null);

  const canDrag = onReorder && groupFields.length === 0 && (!sorting || sorting.length === 0);

  // Apply custom row order if no sort/group active
  let rows = allRows;
  if (canDrag && rowOrder && rowOrder.length > 0) {
    const orderMap = new Map(rowOrder.map((id, i) => [id, i]));
    rows = [...allRows].sort((a, b) => {
      const ai = orderMap.get(a.original.id) ?? Infinity;
      const bi = orderMap.get(b.original.id) ?? Infinity;
      return ai - bi;
    });
  }

  const handleDragStart = useCallback((id: string, index: number) => {
    setDraggedId(id);
    dragSourceIndex.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const targetIndex = e.clientY < midY ? index : index + 1;
    setDropIndex(targetIndex);
  }, []);

  const handleDrop = useCallback(() => {
    if (draggedId === null || dropIndex === null || dragSourceIndex.current === null) return;
    const currentOrder = rows.map((r) => r.original.id);
    const fromIndex = currentOrder.indexOf(draggedId);
    if (fromIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(fromIndex, 1);
    const adjustedDrop = dropIndex > fromIndex ? dropIndex - 1 : dropIndex;
    newOrder.splice(adjustedDrop, 0, draggedId);

    onReorder?.(newOrder);
    setDraggedId(null);
    setDropIndex(null);
    dragSourceIndex.current = null;
  }, [draggedId, dropIndex, rows, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropIndex(null);
    dragSourceIndex.current = null;
  }, []);

  const gridRef = useRef<HTMLDivElement>(null);
  const focusFirstCell = useCallback(() => {
    const cell = gridRef.current?.querySelector<HTMLElement>('[role="gridcell"]');
    if (cell) cell.focus();
  }, []);

  if (groupFields.length > 0) {
    return (
      <RovingTabIndexProvider>
        <div ref={gridRef} role="grid" tabIndex={0} style={{ display: "flex", flexDirection: "column", gap: GAP_PX, outline: "none" }}
          onKeyDown={(e) => {
            if (e.target === gridRef.current) { focusFirstCell(); e.preventDefault(); }
          }}>
          <NestedGroups rows={rows} visibleCols={visibleCols} groupFields={groupFields}
            groupSortDirs={groupSortDirs} depth={0} openGroups={openGroups}
            toggleGroup={toggleGroup} onUpdate={onUpdate} showHeaders={false} picklistColors={picklistColors} onCreate={onCreate} />
        </div>
      </RovingTabIndexProvider>
    );
  }

  return (
    <RovingTabIndexProvider>
      <div ref={gridRef} role="grid" tabIndex={0} style={{ display: "flex", flexDirection: "column", gap: GAP_PX, outline: "none" }}
        onKeyDown={(e) => {
          if (e.target === gridRef.current) { focusFirstCell(); e.preventDefault(); }
        }}>
        <FlexColumnHeaders indent={0} visibleCols={visibleCols} />
        {rows.map((row, i) => {
          if (canDrag) {
            return (
              <DraggableRow
                key={row.id} row={row} visibleCols={visibleCols}
                onUpdate={onUpdate} picklistColors={picklistColors} rowIndex={i}
                draggedId={draggedId} dropIndex={dropIndex}
                onDragStart={handleDragStart} onDragOver={handleDragOver}
                onDrop={handleDrop} onDragEnd={handleDragEnd}
              />
            );
          }
          return (
            <FlexDataRow key={row.id} row={row} visibleCols={visibleCols} depth={0}
              onUpdate={onUpdate} picklistColors={picklistColors} rowIndex={i} />
          );
        })}
        {/* Drop indicator after last row */}
        {canDrag && dropIndex === rows.length && draggedId !== null && (
          <div style={{ height: 2, background: "var(--primary)" }} />
        )}
        {onCreate && <NewRow visibleCols={visibleCols} depth={0} onCreate={onCreate} />}
      </div>
    </RovingTabIndexProvider>
  );
}
