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
} from "@dnd-kit/sortable";
import { PillSelect, type PillOption } from "@/components/pill";
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
  updateBacklogYesOrNotYet,
  updateBacklogDesignParadigm,
  updateBacklogStatus,
  updateBacklogPrototypeStage,
  createBacklogItem,
  deleteBacklogItem,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";

const createPriority = (name: string) =>
  createPicklistOptionNamed("backlog_priorities", name);
const createCategory = (name: string) =>
  createPicklistOptionNamed("backlog_categories", name);
const createYesOrNotYet = (name: string) =>
  createPicklistOptionNamed("backlog_yes_or_not_yet", name);
const createDesignParadigm = (name: string) =>
  createPicklistOptionNamed("backlog_design_paradigms", name);
const createStatus = (name: string) =>
  createPicklistOptionNamed("backlog_statuses", name);
const createPrototypeStage = (name: string) =>
  createPicklistOptionNamed("backlog_prototype_stages", name);

export interface BacklogRow {
  id: string;
  main_entry: string | null;
  details: string | null;
  image_url: string | null;
  priority_id: string | null;
  primary_category_id: string | null;
  yes_or_not_yet_id: string | null;
  design_paradigm_id: string | null;
  status_id: string | null;
  prototype_stage_id: string | null;
}

const COLUMN_KEYS = [
  "main_entry",
  "priority",
  "category",
  "status",
  "yes_or_not_yet",
  "design_paradigm",
  "prototype_stage",
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
  status: "Status",
  yes_or_not_yet: "Yes or Not Yet",
  design_paradigm: "Design Paradigm",
  prototype_stage: "Prototype Stage",
  details: "Details",
  image: "Image",
};

const GROUPABLE_KEYS = [
  "priority",
  "category",
  "status",
  "yes_or_not_yet",
  "design_paradigm",
  "prototype_stage",
] as const;

const ROW_FIELD_FOR_GROUP: Record<string, keyof BacklogRow> = {
  priority: "priority_id",
  category: "primary_category_id",
  status: "status_id",
  yes_or_not_yet: "yes_or_not_yet_id",
  design_paradigm: "design_paradigm_id",
  prototype_stage: "prototype_stage_id",
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
  return row.pathIncludingSelf[level] ?? null;
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
      const fieldLabel = headerLabels[span.group.field] ?? span.group.field;

      if (isOwnCollapsedLevel) {
        // Span this single summary row to the far right: covers remaining
        // icicle levels AND all data columns. No more cells needed in
        // this <tr>.
        icicleCells.push(
          <td
            key={`ice-${L}`}
            rowSpan={span.rowSpan}
            colSpan={iceLevels - L + orderedKeys.length}
            className="themed-group-merged-cell cursor-pointer select-none"
            onClick={() => toggle(span.group.path)}
            title="Expand"
          >
            <Caret className="inline-block w-3 h-3 mr-1 align-[-2px]" />
            <span className="text-[color:var(--muted-foreground)] text-xs mr-2">
              {fieldLabel}:
            </span>
            <span className="font-medium">{span.group.label}</span>
            <span className="text-[color:var(--muted-foreground)] text-xs ml-2">
              ({span.group.count})
            </span>
          </td>,
        );
        renderedCollapsedRight = true;
        break;
      }

      // Merged-cell label spanning all rows in this expanded group.
      icicleCells.push(
        <td
          key={`ice-${L}`}
          rowSpan={span.rowSpan}
          className="themed-group-merged-cell cursor-pointer select-none"
          onClick={() => toggle(span.group.path)}
          title="Collapse"
        >
          <div className="flex items-start gap-1">
            <Caret className="w-3 h-3 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">{span.group.label}</div>
              <div className="text-[color:var(--muted-foreground)] text-xs">
                {fieldLabel} · {span.group.count}
              </div>
            </div>
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

    // Data row.
    const row = frow.row;
    out.push(
      <RowContextMenu
        key={row.id}
        onDelete={() => onDelete(row)}
        itemLabel={row.main_entry ? `"${row.main_entry}"` : "this backlog item"}
      >
        {icicleCells}
        {orderedKeys.map((key) => cellRenderers[key]?.(row))}
      </RowContextMenu>,
    );
  }
  return out;
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
  yesOrNotYetOptions,
  designParadigmOptions,
  statusOptions,
  prototypeStageOptions,
  initialParams,
}: {
  rows: BacklogRow[];
  priorityOptions: PillOption[];
  categoryOptions: PillOption[];
  yesOrNotYetOptions: PillOption[];
  designParadigmOptions: PillOption[];
  statusOptions: PillOption[];
  prototypeStageOptions: PillOption[];
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
    status: statusOptions,
    yes_or_not_yet: yesOrNotYetOptions,
    design_paradigm: designParadigmOptions,
    prototype_stage: prototypeStageOptions,
  };

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
    };
  });

  const tree = useMemo(
    () => groupRows(rows, specs),
    // specs is rebuilt on every render; include its signature instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, groupBy.join(",")],
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedKeys.indexOf(String(active.id));
    const newIndex = orderedKeys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setColumnOrder(arrayMove(orderedKeys, oldIndex, newIndex));
  };

  const userColsWidth = orderedKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? 0),
    0,
  );
  const totalWidth = userColsWidth + iceLevels * ICICLE_COLUMN_WIDTH;
  const totalColumnCount = iceLevels + orderedKeys.length;

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const cellRenderers: Record<string, (row: BacklogRow) => React.ReactNode> = {
    main_entry: (row) => (
      <td key="main_entry" className={`${cellClass} text-foreground`}>
        <EditableText
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
    status: (row) => (
      <td key="status" className={cellClass}>
        <PillSelect
          value={row.status_id ?? ""}
          options={statusOptions}
          onSave={(v) => updateBacklogStatus(row.id, v)}
          onCreate={createStatus}
        />
      </td>
    ),
    yes_or_not_yet: (row) => (
      <td key="yes_or_not_yet" className={cellClass}>
        <PillSelect
          value={row.yes_or_not_yet_id ?? ""}
          options={yesOrNotYetOptions}
          onSave={(v) => updateBacklogYesOrNotYet(row.id, v)}
          onCreate={createYesOrNotYet}
        />
      </td>
    ),
    design_paradigm: (row) => (
      <td key="design_paradigm" className={cellClass}>
        <PillSelect
          value={row.design_paradigm_id ?? ""}
          options={designParadigmOptions}
          onSave={(v) => updateBacklogDesignParadigm(row.id, v)}
          onCreate={createDesignParadigm}
        />
      </td>
    ),
    prototype_stage: (row) => (
      <td key="prototype_stage" className={cellClass}>
        <PillSelect
          value={row.prototype_stage_id ?? ""}
          options={prototypeStageOptions}
          onSave={(v) => updateBacklogPrototypeStage(row.id, v)}
          onCreate={createPrototypeStage}
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
                <col
                  key={`ice-${i}`}
                  style={{ width: ICICLE_COLUMN_WIDTH }}
                />
              ))}
              {orderedKeys.map((key) => (
                <col key={key} style={{ width: params.columnWidths[key] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {Array.from({ length: iceLevels }).map((_, i) => (
                  <th
                    key={`ice-h-${i}`}
                    aria-hidden="true"
                    className={headerClass}
                    style={{ width: ICICLE_COLUMN_WIDTH, padding: 0 }}
                  />
                ))}
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
                  )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </>
  );
}
