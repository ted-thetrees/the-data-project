"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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
import {
  Pill,
  PillSelect,
  MultiPillSelect,
  type PillOption,
} from "@/components/pill";
import { GroupByPicker } from "@/components/group-by-picker";
import {
  groupRows,
  type GroupBySpec,
  type GroupItem,
  type GroupNode,
} from "@/lib/table-grouping";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
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
import {
  updateUserStoryTitle,
  updateUserStoryNarrative,
  updateUserStoryCategory,
  addUserStoryRole,
  removeUserStoryRole,
  createUserStory,
  createUserStoryInGroup,
  deleteUserStory,
  reorderUserStoryRows,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";

const createUserStoryRoleOption = (name: string) =>
  createPicklistOptionNamed("user_story_roles", name);
const createUserStoryCategoryOption = (name: string) =>
  createPicklistOptionNamed("user_story_categories", name);

export interface UserStoryRow {
  id: string;
  title: string;
  narrative: string | null;
  category_id: string | null;
  roles: Array<{ id: string; name: string }>;
}

import {
  USER_STORIES_STORAGE_KEY,
  USER_STORIES_DEFAULT_WIDTHS,
} from "./config";

const COLUMN_KEYS = ["as", "narrative", "title", "category"] as const;

const DEFAULT_WIDTHS = USER_STORIES_DEFAULT_WIDTHS;

const HEADER_LABELS: Record<string, string> = {
  as: "As",
  narrative: "Narrative",
  title: "Title",
  category: "Category",
};

const GROUPABLE_KEYS = ["category"] as const;

const ROW_FIELD_FOR_GROUP: Record<string, keyof UserStoryRow> = {
  category: "category_id",
};

const ICICLE_COLUMN_WIDTH = 200;

type FlatRow =
  | { kind: "data"; row: UserStoryRow; path: GroupNode<UserStoryRow>[] }
  | {
      kind: "collapsed";
      group: GroupNode<UserStoryRow>;
      pathIncludingSelf: GroupNode<UserStoryRow>[];
    }
  | {
      kind: "add";
      group: GroupNode<UserStoryRow>;
      path: GroupNode<UserStoryRow>[];
    };

function flatten(
  items: GroupItem<UserStoryRow>[],
  collapsed: Set<string>,
  parentPath: GroupNode<UserStoryRow>[],
): FlatRow[] {
  const out: FlatRow[] = [];
  for (const item of items) {
    if (item.kind === "group") {
      const pathInc = [...parentPath, item];
      if (collapsed.has(item.path)) {
        out.push({ kind: "collapsed", group: item, pathIncludingSelf: pathInc });
      } else {
        const isInnermost = item.children.every((c) => c.kind === "row");
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
  group: GroupNode<UserStoryRow>;
}

function computeSpans(flat: FlatRow[], level: number): LevelSpan[] {
  const out: LevelSpan[] = [];
  let current: LevelSpan | null = null;
  for (let i = 0; i < flat.length; i++) {
    const f = flat[i];
    const g =
      f.kind === "collapsed"
        ? f.pathIncludingSelf[level] ?? null
        : f.path[level] ?? null;
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

function prefillFromPath(
  path: GroupNode<UserStoryRow>[],
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const g of path) {
    const col = ROW_FIELD_FOR_GROUP[g.field];
    if (col) out[col as string] = g.value;
  }
  return out;
}

function SortableUserStoryRow({
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

function NewUserStoryRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createUserStory());
        }}
        title="Create a new user story"
      >
        {pending ? "Creating…" : "+ New user story"}
      </td>
    </tr>
  );
}

export function UserStoriesTable({
  rows,
  roleOptions,
  categoryOptions,
  initialParams,
}: {
  rows: UserStoryRow[];
  roleOptions: PillOption[];
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
  } = useTableViews(USER_STORIES_STORAGE_KEY, DEFAULT_WIDTHS, initialParams);

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

  const colorByCategoryId = useMemo(
    () => new Map(categoryOptions.map((o) => [o.id, o.color])),
    [categoryOptions],
  );

  const specs: GroupBySpec<UserStoryRow>[] = groupBy.map((field) => {
    const rowField = ROW_FIELD_FOR_GROUP[field];
    const opts = field === "category" ? categoryOptions : [];
    const lookup = new Map(opts.map((o) => [o.id, o.name] as const));
    return {
      field,
      getKey: (row) => {
        const v = row[rowField];
        return typeof v === "string" && v.length > 0 ? v : null;
      },
      getLabel: (key) =>
        key === null ? "Uncategorized" : lookup.get(key) ?? "(unknown)",
      keyOrder: opts.map((o) => o.id),
    };
  });

  const tree = useMemo(
    () => groupRows(rows, specs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, groupBy.join(",")],
  );

  const iceWidth = (level: number) => {
    const field = groupBy[level];
    if (!field) return ICICLE_COLUMN_WIDTH;
    return params.columnWidths[`__ice:${field}`] ?? ICICLE_COLUMN_WIDTH;
  };

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

  const [, startReorder] = useTransition();
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    // Column drag
    if (orderedKeys.includes(activeId)) {
      const oldIndex = orderedKeys.indexOf(activeId);
      const newIndex = orderedKeys.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;
      setColumnOrder(arrayMove(orderedKeys, oldIndex, newIndex));
      return;
    }
    // Row drag (only in ungrouped view)
    if (iceLevels === 0) {
      const ids = rows.map((r) => r.id);
      const oldIdx = ids.indexOf(activeId);
      const newIdx = ids.indexOf(overId);
      if (oldIdx < 0 || newIdx < 0) return;
      const next = arrayMove(ids, oldIdx, newIdx);
      startReorder(() => reorderUserStoryRows(next));
    }
  };

  const userColsWidth = orderedKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? 0),
    0,
  );
  const iceColsWidth = Array.from({ length: iceLevels }).reduce<number>(
    (sum, _, i) => sum + iceWidth(i),
    0,
  );
  const gripCols = iceLevels === 0 ? 1 : 0;
  const gripWidth = 22;
  const totalWidth = userColsWidth + iceColsWidth + gripCols * gripWidth;
  const totalColumnCount = iceLevels + gripCols + orderedKeys.length;

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const cellRenderers: Record<string, (row: UserStoryRow) => React.ReactNode> =
    {
      as: (row) => (
        <td key="as" className={cellClass}>
          <MultiPillSelect
            value={row.roles.map((r) => r.id)}
            options={roleOptions}
            onAdd={(id) => addUserStoryRole(row.id, id)}
            onRemove={(id) => removeUserStoryRole(row.id, id)}
            onCreate={createUserStoryRoleOption}
          />
        </td>
      ),
      narrative: (row) => (
        <td key="narrative" className={cellClass}>
          <EditableTextWrap
            value={row.narrative ?? ""}
            onSave={(v) => updateUserStoryNarrative(row.id, v)}
          />
        </td>
      ),
      title: (row) => (
        <td key="title" className={`${cellClass} text-foreground`}>
          <EditableText
            value={row.title}
            onSave={(v) => updateUserStoryTitle(row.id, v)}
          />
        </td>
      ),
      category: (row) => (
        <td key="category" className={cellClass}>
          <PillSelect
            value={row.category_id ?? ""}
            options={categoryOptions}
            onSave={(v) => updateUserStoryCategory(row.id, v)}
            onCreate={createUserStoryCategoryOption}
          />
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
            onKeyDown={handleGridKeyDown}
            style={{
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: "var(--row-gap)",
              width: totalWidth,
            }}
          >
            <colgroup>
              {Array.from({ length: iceLevels }).map((_, i) => (
                <col key={`ice-${i}`} style={{ width: iceWidth(i) }} />
              ))}
              {gripCols > 0 && <col key="grip" style={{ width: gripWidth }} />}
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
                  {orderedKeys.map((key, i) => (
                    <SortableHeaderCell
                      key={key}
                      id={key}
                      className={headerClass}
                      extras={
                        <ColumnResizer
                          columnIndex={i + iceLevels + gripCols}
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
              <NewUserStoryRow colSpan={totalColumnCount} />
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
                    <SortableUserStoryRow
                      key={row.id}
                      rowId={row.id}
                      onDelete={() => deleteUserStory(row.id)}
                      itemLabel={row.title ? `"${row.title}"` : "this user story"}
                      gripWidth={gripWidth}
                    >
                      {orderedKeys.map((key) => cellRenderers[key]?.(row))}
                    </SortableUserStoryRow>
                  ))}
                </SortableContext>
              ) : (
                renderGroupedTree(
                    tree,
                    collapsed,
                    toggleCollapsed,
                    iceLevels,
                    orderedKeys,
                    cellRenderers,
                    (row) => deleteUserStory(row.id),
                    colorByCategoryId,
                    (prefill) => {
                      startCreateInGroup(() =>
                        createUserStoryInGroup(prefill),
                      );
                    },
                  )
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </>
  );
}

function renderGroupedTree(
  tree: GroupItem<UserStoryRow>[],
  collapsed: Set<string>,
  toggle: (path: string) => void,
  iceLevels: number,
  orderedKeys: string[],
  cellRenderers: Record<string, (row: UserStoryRow) => React.ReactNode>,
  onDelete: (row: UserStoryRow) => void | Promise<void>,
  colorByCategoryId: Map<string, string | null>,
  onAddInGroup: (prefill: Record<string, string | null>) => void,
): React.ReactNode[] {
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
          ? colorByCategoryId.get(span.group.value) ?? null
          : null;
      if (isCollapsedLevel) {
        icicleCells.push(
          <td
            key={`ice-${L}`}
            rowSpan={span.rowSpan}
            colSpan={iceLevels - L + orderedKeys.length}
            className="themed-group-merged-cell cursor-pointer select-none"
            onClick={() => toggle(span.group.path)}
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
          onClick={() => toggle(span.group.path)}
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
      const prefill: Record<string, string | null> = {};
      for (const g of frow.path) {
        const col = ROW_FIELD_FOR_GROUP[g.field];
        if (col) prefill[col as string] = g.value;
      }
      out.push(
        <tr key={`add-${frow.group.path}`}>
          {icicleCells}
          <td
            colSpan={orderedKeys.length}
            className="themed-new-row-cell"
            onClick={() => onAddInGroup(prefill)}
            title="Add a user story in this group"
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
        onDelete={() => onDelete(row)}
        itemLabel={row.title ? `"${row.title}"` : "this user story"}
      >
        {icicleCells}
        {orderedKeys.map((key) => cellRenderers[key]?.(row))}
      </RowContextMenu>,
    );
  }
  return out;
}
