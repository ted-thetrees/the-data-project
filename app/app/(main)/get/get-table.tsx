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
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { Pill, PillSelect, type PillOption } from "@/components/pill";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import { EditableLink } from "@/components/editable-link";
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
import { createPicklistOptionNamed } from "../pick-lists/actions";
import { GET_STORAGE_KEY, GET_DEFAULT_WIDTHS } from "./config";
import {
  createGetItem,
  createGetItemInGroup,
  deleteGetItem,
  reorderGetRows,
  updateGetName,
  updateGetCategory,
  updateGetStatus,
  updateGetSource,
  updateGetSourceDetail,
  updateGetUrl,
  updateGetNotes,
} from "./actions";

export interface GetRow {
  id: string;
  name: string;
  category_id: string | null;
  status_id: string | null;
  source_id: string | null;
  source_detail: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
}

const COLUMN_KEYS = [
  "name",
  "category",
  "status",
  "source",
  "source_detail",
  "url",
  "notes",
] as const;

const HEADER_LABELS: Record<string, string> = {
  name: "Name",
  category: "Category",
  status: "Status",
  source: "Source",
  source_detail: "Source Detail",
  url: "Link",
  notes: "Notes",
};

const GROUPABLE_KEYS = ["category", "status", "source"] as const;

const ROW_FIELD_FOR_GROUP: Record<string, keyof GetRow> = {
  category: "category_id",
  status: "status_id",
  source: "source_id",
};

const ICICLE_COLUMN_WIDTH = 180;

const createCategory = (name: string) =>
  createPicklistOptionNamed("get_categories", name);
const createStatus = (name: string) =>
  createPicklistOptionNamed("get_statuses", name);
const createSource = (name: string) =>
  createPicklistOptionNamed("get_sources", name);

function SortableGetRow({
  rowId,
  onDelete,
  itemLabel,
  gripWidth,
  children,
}: {
  rowId: string;
  onDelete: () => void | Promise<void>;
  itemLabel: string;
  gripWidth: number;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId });
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
      trProps={{ ref: setNodeRef, ...attributes }}
    >
      <td
        {...listeners}
        className="cursor-grab select-none bg-[color:var(--cell-bg)] text-[color:var(--muted-foreground)] align-middle"
        style={{
          width: gripWidth,
          padding: 0,
          textAlign: "center",
          touchAction: "none",
        }}
        title="Drag to reorder"
      >
        <GripVertical className="inline-block w-3 h-3 opacity-60 hover:opacity-100" />
      </td>
      {children}
    </RowContextMenu>
  );
}

type FlatRow =
  | { kind: "data"; row: GetRow; path: GroupNode<GetRow>[] }
  | {
      kind: "collapsed";
      group: GroupNode<GetRow>;
      pathIncludingSelf: GroupNode<GetRow>[];
    }
  | {
      kind: "add";
      group: GroupNode<GetRow>;
      path: GroupNode<GetRow>[];
    };

function flatten(
  items: GroupItem<GetRow>[],
  collapsed: Set<string>,
  parentPath: GroupNode<GetRow>[],
): FlatRow[] {
  const out: FlatRow[] = [];
  for (const item of items) {
    if (item.kind === "group") {
      const pathInc = [...parentPath, item];
      if (collapsed.has(item.path)) {
        out.push({ kind: "collapsed", group: item, pathIncludingSelf: pathInc });
      } else {
        const isInnermost = item.children.every((c) => c.kind === "row");
        // "+ Add" at TOP of each innermost group, per the "New Rows Go on Top" rule.
        if (isInnermost) out.push({ kind: "add", group: item, path: pathInc });
        out.push(...flatten(item.children, collapsed, pathInc));
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
  group: GroupNode<GetRow>;
}

function groupAtLevel(f: FlatRow, level: number): GroupNode<GetRow> | null {
  if (f.kind === "data") return f.path[level] ?? null;
  if (f.kind === "add") return f.path[level] ?? null;
  return f.pathIncludingSelf[level] ?? null;
}

function computeSpans(flat: FlatRow[], level: number): LevelSpan[] {
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

function prefillFromPath(path: GroupNode<GetRow>[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const g of path) {
    const col = ROW_FIELD_FOR_GROUP[g.field];
    if (col) out[col as string] = g.value;
  }
  return out;
}

export function GetTable({
  rows,
  categoryOptions,
  statusOptions,
  sourceOptions,
  initialParams,
}: {
  rows: GetRow[];
  categoryOptions: PillOption[];
  statusOptions: PillOption[];
  sourceOptions: PillOption[];
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
  } = useTableViews(GET_STORAGE_KEY, GET_DEFAULT_WIDTHS, initialParams);

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
    category: categoryOptions,
    status: statusOptions,
    source: sourceOptions,
  };

  const colorLookup: Record<string, Map<string, string | null>> =
    Object.fromEntries(
      Object.entries(optionsForField).map(([field, opts]) => [
        field,
        new Map(opts.map((o) => [o.id, o.color])),
      ]),
    );

  const specs: GroupBySpec<GetRow>[] = groupBy.map((field) => {
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

  const tree = useMemo(
    () => groupRows(rows, specs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, groupBy.join(",")],
  );

  const orderedKeys = useMemo(
    () =>
      resolveColumnOrder(params.columnOrder, COLUMN_KEYS as readonly string[]),
    [params.columnOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [, startReorder] = useTransition();
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    // Column drag (header reorder)
    if (orderedKeys.includes(activeId)) {
      const oldIndex = orderedKeys.indexOf(activeId);
      const newIndex = orderedKeys.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;
      setColumnOrder(arrayMove(orderedKeys, oldIndex, newIndex));
      return;
    }
    // Row drag (only in flat / ungrouped view for now)
    if (iceLevels === 0) {
      const ids = rows.map((r) => r.id);
      const oldIdx = ids.indexOf(activeId);
      const newIdx = ids.indexOf(overId);
      if (oldIdx < 0 || newIdx < 0) return;
      const next = arrayMove(ids, oldIdx, newIdx);
      startReorder(() => reorderGetRows(next));
    }
  };

  const iceWidth = (level: number) => {
    const field = groupBy[level];
    if (!field) return ICICLE_COLUMN_WIDTH;
    return params.columnWidths[`__ice:${field}`] ?? ICICLE_COLUMN_WIDTH;
  };
  const userColsWidth = orderedKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? GET_DEFAULT_WIDTHS[k] ?? 200),
    0,
  );
  const iceColsWidth = Array.from({ length: iceLevels }).reduce<number>(
    (sum, _, i) => sum + iceWidth(i),
    0,
  );
  const gripCols = iceLevels === 0 ? 1 : 0; // grip column only in flat view
  const gripWidth = 22;
  const totalWidth = userColsWidth + iceColsWidth + gripCols * gripWidth;
  const totalColumnCount = iceLevels + gripCols + orderedKeys.length;

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const cellRenderers: Record<string, (row: GetRow) => React.ReactNode> = {
    name: (row) => (
      <td key="name" className={cellClass}>
        <EditableTextWrap value={row.name} onSave={(v) => updateGetName(row.id, v)} />
      </td>
    ),
    category: (row) => (
      <td key="category" className={cellClass}>
        <PillSelect
          value={row.category_id ?? ""}
          options={categoryOptions}
          onSave={(v) => updateGetCategory(row.id, v)}
          onCreate={createCategory}
        />
      </td>
    ),
    status: (row) => (
      <td key="status" className={cellClass}>
        <PillSelect
          value={row.status_id ?? ""}
          options={statusOptions}
          onSave={(v) => updateGetStatus(row.id, v)}
          onCreate={createStatus}
        />
      </td>
    ),
    source: (row) => (
      <td key="source" className={cellClass}>
        <PillSelect
          value={row.source_id ?? ""}
          options={sourceOptions}
          onSave={(v) => updateGetSource(row.id, v)}
          onCreate={createSource}
        />
      </td>
    ),
    source_detail: (row) => (
      <td key="source_detail" className={cellClass}>
        <EditableText
          value={row.source_detail ?? ""}
          onSave={(v) => updateGetSourceDetail(row.id, v)}
        />
      </td>
    ),
    url: (row) => (
      <td key="url" className={cellClass}>
        <EditableLink value={row.url} onSave={(v) => updateGetUrl(row.id, v)} />
      </td>
    ),
    notes: (row) => (
      <td key="notes" className={cellClass}>
        <EditableTextWrap
          value={row.notes ?? ""}
          onSave={(v) => updateGetNotes(row.id, v)}
        />
      </td>
    ),
  };

  const renderGrouped = (): React.ReactNode[] => {
    const flat = flatten(tree, collapsed, []);
    const spanStartAt: Map<number, LevelSpan>[] = [];
    for (let L = 0; L < iceLevels; L++) {
      const spans = computeSpans(flat, L);
      const map = new Map<number, LevelSpan>();
      for (const s of spans) map.set(s.startIndex, s);
      spanStartAt.push(map);
    }

    const out: React.ReactNode[] = [];
    for (let i = 0; i < flat.length; i++) {
      const frow = flat[i];
      const icicleCells: React.ReactNode[] = [];
      let collapsedRight = false;

      for (let L = 0; L < iceLevels; L++) {
        const span = spanStartAt[L].get(i);
        if (!span) continue;
        const isCollapsedLevel =
          frow.kind === "collapsed" && frow.group.level === L;
        const color =
          span.group.value != null
            ? colorLookup[span.group.field]?.get(span.group.value) ?? null
            : null;
        if (isCollapsedLevel) {
          icicleCells.push(
            <td
              key={`ice-${L}`}
              rowSpan={span.rowSpan}
              colSpan={iceLevels - L + orderedKeys.length}
              className="themed-group-merged-cell cursor-pointer select-none"
              onClick={() => toggleCollapsed(span.group.path)}
              title="Expand"
            >
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 shrink-0" />
                <Pill color={color}>{span.group.label}</Pill>
                <span className="text-[color:var(--muted-foreground)] text-xs">
                  ({span.group.count})
                </span>
              </div>
            </td>,
          );
          collapsedRight = true;
          break;
        }
        icicleCells.push(
          <td
            key={`ice-${L}`}
            rowSpan={span.rowSpan}
            className="themed-group-merged-cell cursor-pointer select-none"
            onClick={() => toggleCollapsed(span.group.path)}
            title="Collapse"
          >
            <div className="flex items-start gap-1">
              <ChevronDown className="w-3 h-3 mt-1 shrink-0" />
              <Pill color={color}>{span.group.label}</Pill>
            </div>
          </td>,
        );
      }

      if (frow.kind === "collapsed") {
        if (!collapsedRight) {
          icicleCells.push(
            <td
              key="placeholder"
              colSpan={orderedKeys.length}
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
              colSpan={orderedKeys.length}
              className="themed-new-row-cell"
              onClick={() =>
                startCreateInGroup(() => createGetItemInGroup(prefill))
              }
              title="Add a thing to get in this group"
            >
              + Add
            </td>
          </tr>,
        );
        continue;
      }

      const row = frow.row;
      out.push(
        <RowContextMenu
          key={row.id}
          onDelete={() => deleteGetItem(row.id)}
          itemLabel={`"${row.name}"`}
        >
          {icicleCells}
          {orderedKeys.map((k) => cellRenderers[k]?.(row))}
        </RowContextMenu>,
      );
    }
    return out;
  };

  const [newPending, startNewTransition] = useTransition();

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
              {gripCols > 0 && <col key="grip" style={{ width: gripWidth }} />}
              {orderedKeys.map((k) => (
                <col
                  key={k}
                  style={{ width: params.columnWidths[k] ?? GET_DEFAULT_WIDTHS[k] }}
                />
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
                      onResize={(w) => setColumnWidth(`__ice:${groupBy[i]}`, w)}
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
                  {orderedKeys.map((k, i) => (
                    <SortableHeaderCell
                      key={k}
                      id={k}
                      className={headerClass}
                      extras={
                        <ColumnResizer
                          columnIndex={i + iceLevels}
                          currentWidth={
                            params.columnWidths[k] ?? GET_DEFAULT_WIDTHS[k] ?? 200
                          }
                          onResize={(w) => setColumnWidth(k, w)}
                        />
                      }
                    >
                      {HEADER_LABELS[k] ?? k}
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
              <tr>
                <td
                  colSpan={totalColumnCount}
                  className="themed-new-row-cell"
                  onClick={() => {
                    if (!newPending) startNewTransition(() => createGetItem());
                  }}
                  title="Create a new thing to get"
                >
                  {newPending ? "Creating…" : "+ New thing to get"}
                </td>
              </tr>
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
              {iceLevels === 0 ? (
                <SortableContext
                  items={rows.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {rows.map((row) => (
                    <SortableGetRow
                      key={row.id}
                      rowId={row.id}
                      onDelete={() => deleteGetItem(row.id)}
                      itemLabel={`"${row.name}"`}
                      gripWidth={gripWidth}
                    >
                      {orderedKeys.map((k) => cellRenderers[k]?.(row))}
                    </SortableGetRow>
                  ))}
                </SortableContext>
              ) : (
                renderGrouped()
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </>
  );
}
