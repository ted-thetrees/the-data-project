"use client";

import { useContext } from "react";
import type { Row } from "@tanstack/react-table";
import { useDataTable } from "@/components/niko-table/core/data-table-context";
import { ColContext, ColResizer } from "./col-context";
import { EditableText, EditableSelect, ImageCell } from "./editable-cells";
import { RovingTabIndexProvider, GridCellNav } from "./grid-cell-nav";
import { NewRow } from "./new-row";
import { DEPTH_COLORS, INDENT_PX, GAP_PX, contrastText } from "./styles";
import type { ColConfig } from "./types";

// --- Column headers ---

export function FlexColumnHeaders({ indent, visibleCols }: { indent: number; visibleCols: ColConfig[] }) {
  const { widths } = useContext(ColContext);
  return (
    <div style={{
      display: "flex", alignItems: "stretch", marginLeft: indent, gap: GAP_PX,
      fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
      color: "var(--muted-foreground)",
    }}>
      {visibleCols.map((col, i) => (
        <div key={col.key} style={{
          ...(i < visibleCols.length - 1 ? { width: widths[i], flexShrink: 0 } : { flex: 1, minWidth: widths[i] }),
          position: "relative", padding: "8px 12px", background: "var(--muted)",
        }}>
          {col.label}
          {i < visibleCols.length - 1 && <ColResizer index={i} />}
        </div>
      ))}
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
  const bg = DEPTH_COLORS[depth] || DEPTH_COLORS[DEPTH_COLORS.length - 1];

  return (
    <div style={{ display: "flex", alignItems: "stretch", marginLeft: indent, gap: GAP_PX }}>
      {visibleCols.map((col, i) => {
        const isLast = i === visibleCols.length - 1;
        const val = (row.original as Record<string, unknown>)[col.key];
        const optionColor = col.type === "select" && val ? picklistColors?.[col.label]?.[(val as string)] : undefined;
        const cellBg = optionColor || bg;
        const cellStyle: React.CSSProperties = {
          background: cellBg,
          ...(optionColor ? { color: contrastText(optionColor) } : {}),
          ...(isLast ? { flex: 1, minWidth: widths[i] } : { width: widths[i], flexShrink: 0 }),
          position: "relative",
          ...(col.fontWeight ? { fontWeight: col.fontWeight } : {}),
        };

        const cellContent = (
          <>
            {col.type === "image" ? (
              <ImageCell value={val} />
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
  const bg = DEPTH_COLORS[depth] || DEPTH_COLORS[DEPTH_COLORS.length - 1];
  return (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 10,
      marginLeft: indent, padding: "9px 16px",
      cursor: "pointer", background: bg,
      marginTop: depth > 0 ? GAP_PX : 0,
      fontWeight: 600, fontSize: 14 - depth,
    }}>
      <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{open ? "▾" : "▸"}</span>
      <span>{label || "—"}</span>
      <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "rgba(0,0,0,0.06)", borderRadius: 999, padding: "1px 8px" }}>{count}</span>
    </div>
  );
}

// --- Nested groups ---

export function NestedGroups<T extends { id: string }>({
  rows, visibleCols, groupFields, groupSortDirs, depth, openGroups, toggleGroup, onUpdate, showHeaders, picklistColors, onCreate,
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
}) {
  if (groupFields.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: GAP_PX, marginTop: GAP_PX }}>
        {showHeaders && <FlexColumnHeaders indent={depth * INDENT_PX} visibleCols={visibleCols} />}
        {rows.map((row, i) => (
          <FlexDataRow key={row.id} row={row} visibleCols={visibleCols} depth={depth} onUpdate={onUpdate} picklistColors={picklistColors} rowIndex={i} />
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

  return (
    <>
      {sortedEntries.map(([label, members]) => {
        const groupKey = `${depth}-${currentField}-${label}`;
        const isOpen = openGroups.has(groupKey);
        const isLeafGroup = remainingFields.length === 0;
        return (
          <div key={groupKey}>
            <GroupHeader label={label} count={members.length} open={isOpen}
              onToggle={() => toggleGroup(groupKey)} depth={depth} />
            {isOpen && (
              <NestedGroups rows={members} visibleCols={visibleCols} groupFields={remainingFields}
                groupSortDirs={remainingSortDirs} depth={depth + 1} openGroups={openGroups}
                toggleGroup={toggleGroup} onUpdate={onUpdate} showHeaders={isLeafGroup} picklistColors={picklistColors} onCreate={onCreate} />
            )}
          </div>
        );
      })}
    </>
  );
}

// --- Main flex body (reads from Niko Table context) ---

export function FlexBody<T extends { id: string }>({
  visibleCols, groupFields, groupSortDirs, openGroups, toggleGroup, onUpdate, picklistColors, onCreate,
}: {
  visibleCols: ColConfig[];
  groupFields: string[];
  groupSortDirs: ("asc" | "desc")[];
  openGroups: Set<string>;
  toggleGroup: (key: string) => void;
  onUpdate: (recordId: string, field: string, value: string) => void;
  picklistColors?: PicklistColorMap;
  onCreate?: (fields: Record<string, string>) => Promise<void>;
}) {
  const { table } = useDataTable<T>();
  const rows = table.getRowModel().rows;

  if (groupFields.length > 0) {
    return (
      <RovingTabIndexProvider>
        <div role="grid" style={{ display: "flex", flexDirection: "column", gap: GAP_PX }}>
          <NestedGroups rows={rows} visibleCols={visibleCols} groupFields={groupFields}
            groupSortDirs={groupSortDirs} depth={0} openGroups={openGroups}
            toggleGroup={toggleGroup} onUpdate={onUpdate} showHeaders={false} picklistColors={picklistColors} onCreate={onCreate} />
        </div>
      </RovingTabIndexProvider>
    );
  }

  return (
    <RovingTabIndexProvider>
      <div role="grid" style={{ display: "flex", flexDirection: "column", gap: GAP_PX }}>
        <FlexColumnHeaders indent={0} visibleCols={visibleCols} />
        {rows.map((row, i) => (
          <FlexDataRow key={row.id} row={row} visibleCols={visibleCols} depth={0} onUpdate={onUpdate} picklistColors={picklistColors} rowIndex={i} />
        ))}
        {onCreate && <NewRow visibleCols={visibleCols} depth={0} onCreate={onCreate} />}
      </div>
    </RovingTabIndexProvider>
  );
}
