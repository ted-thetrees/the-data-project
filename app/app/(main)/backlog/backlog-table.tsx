"use client";

import { useMemo, useState, useTransition } from "react";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Pill, PillSelect, type PillOption } from "@/components/pill";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import { Empty } from "@/components/empty";
import {
  useTableViews,
  resolveColumnOrder,
  type ViewParams,
} from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { RowContextMenu } from "@/components/row-context-menu";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
import { GroupByPicker } from "@/components/group-by-picker";
import {
  groupRows,
  type GroupBySpec,
  type GroupItem,
  type GroupNode,
} from "@/lib/table-grouping";
import { ChevronRight, ChevronDown } from "lucide-react";
import {
  updateBacklogMainEntry,
  updateBacklogDetails,
  updateBacklogPriority,
  updateBacklogCategory,
  createBacklogItem,
  createBacklogItemInGroup,
  deleteBacklogItem,
  reorderBacklogRows,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";

const createPriority = (name: string) =>
  createPicklistOptionNamed("backlog_priorities", name);
const createCategory = (name: string) =>
  createPicklistOptionNamed("backlog_categories", name);

export interface BacklogRow {
  id: string;
  main_entry: string | null;
  details: string | null;
  image_url: string | null;
  sort_order: number | null;
  priority_id: string | null;
  primary_category_id: string | null;
}

const COLUMN_KEYS = [
  "main_entry",
  "priority",
  "category",
  "details",
  "image",
] as const;

import {
  BACKLOG_STORAGE_KEY,
  BACKLOG_DEFAULT_WIDTHS,
} from "./config";

const DEFAULT_WIDTHS = BACKLOG_DEFAULT_WIDTHS;

const HEADER_LABELS: Record<string, string> = {
  main_entry: "Main Entry",
  priority: "Priority",
  category: "Primary Category",
  details: "Details",
  image: "Image",
};

const GROUPABLE_KEYS = [
  "priority",
  "category",
] as const;

const ROW_FIELD_FOR_GROUP: Record<string, keyof BacklogRow> = {
  priority: "priority_id",
  category: "primary_category_id",
};

const ICICLE_COLUMN_WIDTH = 160;

type FlatRow =
  | {
      kind: "data";
      row: BacklogRow;
      /** Ancestor groups — one per active grouping level. */
      path: GroupNode<BacklogRow>[];
    }
  | {
      kind: "collapsed";
      group: GroupNode<BacklogRow>;
      /** Path including `group` at its own level. */
      pathIncludingSelf: GroupNode<BacklogRow>[];
    }
  | {
      kind: "add";
      /** Innermost group this add-row belongs to. */
      group: GroupNode<BacklogRow>;
      /** Path including the innermost group itself. */
      path: GroupNode<BacklogRow>[];
    };

function flattenTree(
  items: GroupItem<BacklogRow>[],
  collapsed: Set<string>,
  parentPath: GroupNode<BacklogRow>[],
): FlatRow[] {
  const out: FlatRow[] = [];
  for (const item of items) {
    if (item.kind === "group") {
      const pathInc = [...parentPath, item];
      if (collapsed.has(item.path)) {
        out.push({ kind: "collapsed", group: item, pathIncludingSelf: pathInc });
      } else {
        const isInnermost = item.children.every((c) => c.kind === "row");
        if (isInnermost) {
          out.push({ kind: "add", group: item, path: pathInc });
        }
        out.push(...flattenTree(item.children, collapsed, pathInc));
      }
    } else {
      out.push({ kind: "data", row: item.row, path: parentPath });
    }
  }
  return out;
}

interface LevelSpan {
  startIndex: number;
  rowSpan: number;
  group: GroupNode<BacklogRow>;
}

function groupAtLevel(
  row: FlatRow,
  level: number,
): GroupNode<BacklogRow> | null {
  if (row.kind === "data") return row.path[level] ?? null;
  if (row.kind === "add") return row.path[level] ?? null;
  return row.pathIncludingSelf[level] ?? null;
}

function prefillFromPath(
  path: GroupNode<BacklogRow>[],
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const g of path) {
    const col = ROW_FIELD_FOR_GROUP[g.field];
    if (col) out[col as string] = g.value;
  }
  return out;
}

function computeLevelSpans(flat: FlatRow[], level: number): LevelSpan[] {
  const out: LevelSpan[] = [];
  let current: LevelSpan | null = null;
  for (let i = 0; i < flat.length; i++) {
    const g = groupAtLevel(flat[i], level);
    if (!g) {
      if (current) out.push(current);
      current = null;
      continue;
    }
    if (current && current.group.path === g.path) {
      current.rowSpan++;
    } else {
      if (current) out.push(current);
      current = { startIndex: i, rowSpan: 1, group: g };
    }
  }
  if (current) out.push(current);
  return out;
}

function renderGroupedTree(
  tree: GroupItem<BacklogRow>[],
  collapsed: Set<string>,
  toggle: (path: string) => void,
  iceLevels: number,
  headerLabels: Record<string, string>,
  orderedKeys: string[],
  cellRenderers: Record<string, (row: BacklogRow) => React.ReactNode>,
  onDelete: (row: BacklogRow) => void | Promise<void>,
  colorLookup: Record<string, Map<string, string | null>>,
  onAddInGroup: (prefill: Record<string, string | null>) => void,
  gripCols: number,
): React.ReactNode[] {
  const flat = flattenTree(tree, collapsed, []);
  const spanStartAt: Map<number, LevelSpan>[] = [];
  for (let L = 0; L < iceLevels; L++) {
    const spans = computeLevelSpans(flat, L);
    const map = new Map<number, LevelSpan>();
    for (const s of spans) map.set(s.startIndex, s);
    spanStartAt.push(map);
  }

  const out: React.ReactNode[] = [];
  for (let i = 0; i < flat.length; i++) {
    const frow = flat[i];
    const icicleCells: React.ReactNode[] = [];
    let renderedCollapsedRight = false;

    for (let L = 0; L < iceLevels; L++) {
      const span = spanStartAt[L].get(i);
      if (!span) continue; // covered by a prior row's rowSpan

      const isOwnCollapsedLevel =
        frow.kind === "collapsed" && frow.group.level === L;
      const Caret = isOwnCollapsedLevel ? ChevronRight : ChevronDown;
      const color =
        span.group.value != null
          ? colorLookup[span.group.field]?.get(span.group.value) ?? null
          : null;

      if (isOwnCollapsedLevel) {
        icicleCells.push(
          <td
            key={`ice-${L}`}
            rowSpan={span.rowSpan}
            colSpan={iceLevels - L + gripCols + orderedKeys.length}
            className="themed-group-merged-cell cursor-pointer select-none"
            onClick={() => toggle(span.group.path)}
            title="Expand"
          >
            <div className="flex items-center gap-2">
              <Caret className="w-3 h-3 shrink-0" />
              <Pill color={color}>{span.group.label}</Pill>
              <span className="text-[color:var(--muted-foreground)] text-xs">
                ({span.group.count})
              </span>
            </div>
          </td>,
        );
        renderedCollapsedRight = true;
        break;
      }

      icicleCells.push(
        <td
          key={`ice-${L}`}
          rowSpan={span.rowSpan}
          className="themed-group-merged-cell cursor-pointer select-none"
          onClick={() => toggle(span.group.path)}
          title="Collapse"
        >
          <div className="flex items-start gap-1">
            <Caret className="w-3 h-3 mt-1 shrink-0" />
            <Pill color={color}>{span.group.label}</Pill>
          </div>
        </td>,
      );
    }

    if (frow.kind === "collapsed") {
      // If the collapsed summary didn't produce its own right-spanning
      // label (shouldn't happen given the logic above, but be defensive),
      // emit a placeholder so the row isn't malformed.
      if (!renderedCollapsedRight) {
        icicleCells.push(
          <td
            key="placeholder"
            colSpan={gripCols + orderedKeys.length}
            className="bg-[color:var(--cell-bg)]"
          />,
        );
      }
      out.push(
        <tr key={`c-${frow.group.path}`} className="themed-group-row">
          {icicleCells}
        </tr>,
      );
      continue;
    }

    if (frow.kind === "add") {
      const prefill = prefillFromPath(frow.path);
      out.push(
        <tr key={`add-${frow.group.path}`}>
          {icicleCells}
          <td
            colSpan={gripCols + orderedKeys.length}
            className="themed-new-row-cell"
            onClick={() => onAddInGroup(prefill)}
            title="Add a backlog item in this group"
          >
            + Add
          </td>
        </tr>,
      );
      continue;
    }

    // Data row.
    const row = frow.row;
    out.push(
      <SortableDataRow
        key={row.id}
        rowId={row.id}
        draggable={gripCols > 0}
        onDelete={() => onDelete(row)}
        itemLabel={row.main_entry ? `"${row.main_entry}"` : "this backlog item"}
        leadingCells={icicleCells}
      >
        {orderedKeys.map((key) => cellRenderers[key]?.(row))}
      </SortableDataRow>,
    );
  }

  // Wrap every innermost group's rows in their own SortableContext so drag
  // is scoped to that sub-table (strict-within-group reorder).
  if (gripCols === 0) return out;
  const wrapped: React.ReactNode[] = [];
  const groupToIds = new Map<string, string[]>();
  for (const f of flat) {
    if (f.kind !== "data") continue;
    const path = f.path[iceLevels - 1]?.path ?? "__none__";
    const arr = groupToIds.get(path) ?? [];
    arr.push(f.row.id);
    groupToIds.set(path, arr);
  }
  let segment: React.ReactNode[] = [];
  let segmentPath: string | null = null;
  const flushSegment = () => {
    if (segment.length === 0) return;
    const ids = groupToIds.get(segmentPath ?? "") ?? [];
    wrapped.push(
      <SortableContext
        key={`sc-${segmentPath}`}
        items={ids}
        strategy={verticalListSortingStrategy}
      >
        {segment}
      </SortableContext>,
    );
    segment = [];
    segmentPath = null;
  };
  for (let i = 0; i < flat.length; i++) {
    const f = flat[i];
    const node = out[i];
    if (f.kind === "collapsed") {
      flushSegment();
      wrapped.push(node);
      continue;
    }
    const path =
      f.kind === "add"
        ? f.group.path
        : f.path[iceLevels - 1]?.path ?? "__none__";
    if (segmentPath !== path) {
      flushSegment();
      segmentPath = path;
    }
    segment.push(node);
  }
  flushSegment();
  return wrapped;
}

function SortableDataRow({
  rowId,
  draggable,
  onDelete,
  itemLabel,
  leadingCells,
  children,
}: {
  rowId: string;
  draggable: boolean;
  onDelete: () => void | Promise<void>;
  itemLabel: string;
  /** Cells that come before the grip (typically icicle cells starting a span). */
  leadingCells: React.ReactNode;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId, disabled: !draggable });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : undefined,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 2 : undefined,
  };
  return (
    <RowContextMenu
      onDelete={onDelete}
      itemLabel={itemLabel}
      rowStyle={style}
      trProps={draggable ? { ref: setNodeRef, ...attributes } : undefined}
    >
      {leadingCells}
      {draggable && (
        <td
          {...listeners}
          className="cursor-grab select-none bg-[color:var(--cell-bg)] text-[color:var(--muted-foreground)] align-middle"
          style={{
            width: 22,
            padding: 0,
            textAlign: "center",
            touchAction: "none",
          }}
          title="Drag to reorder"
        >
          <GripVertical className="inline-block w-3 h-3 opacity-60 hover:opacity-100" />
        </td>
      )}
      {children}
    </RowContextMenu>
  );
}

function NewBacklogRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createBacklogItem());
        }}
        title="Create a new backlog item"
      >
        {pending ? "Creating…" : "+ New backlog item"}
      </td>
    </tr>
  );
}

export function BacklogTable({
  rows,
  priorityOptions,
  categoryOptions,
  initialParams,
}: {
  rows: BacklogRow[];
  priorityOptions: PillOption[];
  categoryOptions: PillOption[];
  initialParams?: ViewParams;
}) {
  const {
    views,
    activeViewId,
    params,
    switchView,
    createView,
    renameView,
    deleteView,
    setColumnWidth,
    setColumnOrder,
    setGroupBy,
  } = useTableViews(BACKLOG_STORAGE_KEY, DEFAULT_WIDTHS, initialParams);

  const groupBy = useMemo(
    () =>
      (params.groupBy ?? []).filter((k): k is (typeof GROUPABLE_KEYS)[number] =>
        (GROUPABLE_KEYS as readonly string[]).includes(k),
      ),
    [params.groupBy],
  );
  const iceLevels = groupBy.length;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [, startCreateInGroup] = useTransition();
  const toggleCollapsed = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const optionsForField: Record<string, PillOption[]> = {
    priority: priorityOptions,
    category: categoryOptions,
  };

  const colorLookup: Record<string, Map<string, string | null>> =
    Object.fromEntries(
      Object.entries(optionsForField).map(([field, opts]) => [
        field,
        new Map(opts.map((o) => [o.id, o.color])),
      ]),
    );

  const specs: GroupBySpec<BacklogRow>[] = groupBy.map((field) => {
    const rowField = ROW_FIELD_FOR_GROUP[field];
    const options = optionsForField[field] ?? [];
    const lookup = new Map(options.map((o) => [o.id, o.name] as const));
    return {
      field,
      getKey: (row) => {
        const v = row[rowField];
        return typeof v === "string" && v.length > 0 ? v : null;
      },
      getLabel: (key) =>
        key === null ? "Uncategorized" : lookup.get(key) ?? "(unknown)",
      keyOrder: options.map((o) => o.id),
    };
  });

  const rowsForGrouping = useMemo(() => {
    if (iceLevels === 0) return rows;
    return [...rows].sort((a, b) => {
      const aso = a.sort_order;
      const bso = b.sort_order;
      if (aso == null && bso == null) {
        return (a.main_entry ?? "").localeCompare(b.main_entry ?? "");
      }
      if (aso == null) return 1;
      if (bso == null) return -1;
      return aso - bso;
    });
  }, [rows, iceLevels]);

  const tree = useMemo(
    () => groupRows(rowsForGrouping, specs),
    // specs is rebuilt on every render; include its signature instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowsForGrouping, groupBy.join(",")],
  );

  const orderedKeys = useMemo(
    () =>
      resolveColumnOrder(
        params.columnOrder,
        COLUMN_KEYS as readonly string[],
      ),
    [params.columnOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [, startRowReorder] = useTransition();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Column drag: ids come from orderedKeys.
    if (orderedKeys.includes(activeId)) {
      const oldIndex = orderedKeys.indexOf(activeId);
      const newIndex = orderedKeys.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;
      setColumnOrder(arrayMove(orderedKeys, oldIndex, newIndex));
      return;
    }

    // Row drag: ids are numeric backlog row ids. Restrict to the innermost
    // group the active row belongs to; ignore cross-group drops.
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const activeRow = rowById.get(activeId);
    const overRow = rowById.get(overId);
    if (!activeRow || !overRow) return;
    const groupKeyFor = (r: BacklogRow) =>
      groupBy
        .map((field) => `${field}:${r[ROW_FIELD_FOR_GROUP[field]] ?? "null"}`)
        .join("|");
    if (groupKeyFor(activeRow) !== groupKeyFor(overRow)) return;
    const key = groupKeyFor(activeRow);
    const groupIds = rowsForGrouping
      .filter((r) => groupKeyFor(r) === key)
      .map((r) => r.id);
    const oldIdx = groupIds.indexOf(activeId);
    const newIdx = groupIds.indexOf(overId);
    if (oldIdx < 0 || newIdx < 0) return;
    const nextIds = arrayMove(groupIds, oldIdx, newIdx);
    startRowReorder(() => reorderBacklogRows(nextIds));
  };

  const iceWidth = (level: number) => {
    const field = groupBy[level];
    if (!field) return ICICLE_COLUMN_WIDTH;
    return params.columnWidths[`__ice:${field}`] ?? ICICLE_COLUMN_WIDTH;
  };
  const userColsWidth = orderedKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? 0),
    0,
  );
  const iceColsWidth = Array.from({ length: iceLevels }).reduce<number>(
    (sum, _, i) => sum + iceWidth(i),
    0,
  );
  const gripCols = iceLevels > 0 ? 1 : 0;
  const gripWidth = 22;
  const totalWidth = userColsWidth + iceColsWidth + gripCols * gripWidth;
  const totalColumnCount = iceLevels + gripCols + orderedKeys.length;

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const cellRenderers: Record<string, (row: BacklogRow) => React.ReactNode> = {
    main_entry: (row) => (
      <td key="main_entry" className={`${cellClass} text-foreground align-top`}>
        <EditableTextWrap
          value={row.main_entry ?? ""}
          onSave={(v) => updateBacklogMainEntry(row.id, v)}
        />
      </td>
    ),
    priority: (row) => (
      <td key="priority" className={cellClass}>
        <PillSelect
          value={row.priority_id ?? ""}
          options={priorityOptions}
          onSave={(v) => updateBacklogPriority(row.id, v)}
          onCreate={createPriority}
        />
      </td>
    ),
    category: (row) => (
      <td key="category" className={cellClass}>
        <PillSelect
          value={row.primary_category_id ?? ""}
          options={categoryOptions}
          onSave={(v) => updateBacklogCategory(row.id, v)}
          onCreate={createCategory}
        />
      </td>
    ),
    details: (row) => (
      <td key="details" className={cellClass}>
        <EditableTextWrap
          value={row.details ?? ""}
          onSave={(v) => updateBacklogDetails(row.id, v)}
        />
      </td>
    ),
    image: (row) => (
      <td key="image" className={cellClass}>
        {row.image_url ? (
          <a
            href={row.image_url}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.image_url}
              alt=""
              style={{
                maxWidth: "100%",
                maxHeight: 48,
                borderRadius: "var(--radius-sm)",
                objectFit: "cover",
              }}
            />
          </a>
        ) : (
          <Empty />
        )}
      </td>
    ),
  };

  return (
    <>
      <ViewSwitcher
        views={views}
        activeViewId={activeViewId}
        onSwitch={switchView}
        onCreate={createView}
        onRename={renameView}
        onDelete={deleteView}
      />
      <GroupByPicker
        available={[...GROUPABLE_KEYS].map((k) => ({
          key: k,
          label: HEADER_LABELS[k] ?? k,
        }))}
        groupBy={groupBy}
        onChange={setGroupBy}
      />
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table
            className="text-[length:var(--cell-font-size)] [&_td]:align-top"
            style={{
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: "var(--row-gap)",
              width: totalWidth,
            }}
            onKeyDown={handleGridKeyDown}
          >
            <colgroup>
              {Array.from({ length: iceLevels }).map((_, i) => (
                <col key={`ice-${i}`} style={{ width: iceWidth(i) }} />
              ))}
              {gripCols > 0 && (
                <col key="grip" style={{ width: gripWidth }} />
              )}
              {orderedKeys.map((key) => (
                <col key={key} style={{ width: params.columnWidths[key] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {Array.from({ length: iceLevels }).map((_, i) => (
                  <th
                    key={`ice-h-${i}`}
                    className={headerClass}
                    style={{ position: "relative" }}
                  >
                    {HEADER_LABELS[groupBy[i]] ?? groupBy[i]}
                    <ColumnResizer
                      columnIndex={i}
                      currentWidth={iceWidth(i)}
                      onResize={(w) =>
                        setColumnWidth(`__ice:${groupBy[i]}`, w)
                      }
                    />
                  </th>
                ))}
                {gripCols > 0 && (
                  <th
                    key="grip-h"
                    className={headerClass}
                    style={{ width: gripWidth }}
                    aria-hidden
                  />
                )}
                <SortableContext
                  items={orderedKeys}
                  strategy={horizontalListSortingStrategy}
                >
                  {orderedKeys.map((key, i) => (
                    <SortableHeaderCell
                      key={key}
                      id={key}
                      className={headerClass}
                      extras={
                        <ColumnResizer
                          columnIndex={i + iceLevels}
                          currentWidth={params.columnWidths[key]}
                          onResize={(w) => setColumnWidth(key, w)}
                        />
                      }
                    >
                      {HEADER_LABELS[key]}
                    </SortableHeaderCell>
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody>
              <tr aria-hidden="true">
                <td
                  colSpan={totalColumnCount}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              <NewBacklogRow colSpan={totalColumnCount} />
              <tr aria-hidden="true">
                <td
                  colSpan={totalColumnCount}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              {iceLevels === 0
                ? rows.map((row) => (
                    <RowContextMenu
                      key={row.id}
                      onDelete={() => deleteBacklogItem(row.id)}
                      itemLabel={
                        row.main_entry
                          ? `"${row.main_entry}"`
                          : "this backlog item"
                      }
                    >
                      {orderedKeys.map((key) => cellRenderers[key]?.(row))}
                    </RowContextMenu>
                  ))
                : renderGroupedTree(
                    tree,
                    collapsed,
                    toggleCollapsed,
                    iceLevels,
                    HEADER_LABELS,
                    orderedKeys,
                    cellRenderers,
                    (row) => deleteBacklogItem(row.id),
                    colorLookup,
                    (prefill) => {
                      startCreateInGroup(() =>
                        createBacklogItemInGroup(prefill),
                      );
                    },
                    gripCols,
                  )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </>
  );
}
