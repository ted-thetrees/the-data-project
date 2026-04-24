"use client";

import { useMemo, useState } from "react";
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
import { ChevronDown, ChevronRight } from "lucide-react";
import { EditableText } from "@/components/editable-text";
import { Empty } from "@/components/empty";
import { Pill, PillSelect, type PillOption } from "@/components/pill";
import { RowContextMenu } from "@/components/row-context-menu";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
import {
  deleteImageFromList,
  setImageFolderStatus,
  updateBubbleDistribution,
  updateImageName,
} from "./actions";
import { createPicklistOptionNamed } from "../../pick-lists/actions";
import {
  useTableViews,
  resolveColumnOrder,
  type ViewParams,
} from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { GroupByPicker } from "@/components/group-by-picker";
import {
  groupRows,
  type GroupBySpec,
  type GroupItem,
  type GroupNode,
} from "@/lib/table-grouping";
import { LIST_STORAGE_KEY, LIST_DEFAULT_WIDTHS } from "./config";

export interface ListRow {
  image_id: string;
  eagle_id: string;
  image_name: string;
  ext: string;
  public_url: string;
  is_video: boolean;
  width: number | null;
  height: number | null;
  bubble_distribution_id: string | null;
  /** Map of folder_id → status_id for folders this image has a status on. */
  folder_statuses: Record<string, string>;
  tag_ids: string[];
}

export interface FolderOption {
  id: string;
  name: string;
  full_path: string;
  color: string | null;
}

export interface TagOption {
  id: string;
  name: string;
}

const STATIC_COLUMN_KEYS = ["image", "name", "bubble_distribution", "tags"] as const;

const STATIC_HEADER_LABELS: Record<string, string> = {
  image: "Image",
  name: "Name",
  bubble_distribution: "Bubble Distribution",
  tags: "Tags",
};

// Group-by is scoped to static fields for now — grouping by per-folder
// columns would be redundant with the column itself.
const GROUPABLE_KEYS = ["tag", "bubble_distribution"] as const;
type GroupField = (typeof GROUPABLE_KEYS)[number];

const GROUPABLE_HEADER_LABELS: Record<string, string> = {
  tag: "Tag",
  bubble_distribution: "Bubble Distribution",
};

const ICICLE_WIDTH_DEFAULT = 200;

export function ListTable({
  rows,
  folders,
  tags,
  bubbleDistributionOptions,
  initialParams,
}: {
  rows: ListRow[];
  folders: FolderOption[];
  tags: TagOption[];
  bubbleDistributionOptions: PillOption[];
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
  } = useTableViews(LIST_STORAGE_KEY, LIST_DEFAULT_WIDTHS, initialParams);

  const groupBy = useMemo(
    () =>
      (params.groupBy ?? []).filter((k): k is GroupField =>
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

  const folderById = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders],
  );
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  // Tag-id ordering: place "Yes" first if it exists, then alphabetical.
  const tagKeyOrder = useMemo(() => {
    const sorted = [...tags].sort((a, b) => {
      if (a.name === "Yes") return -1;
      if (b.name === "Yes") return 1;
      return a.name.localeCompare(b.name);
    });
    return sorted.map((t) => t.id);
  }, [tags]);

  const bubbleById = useMemo(
    () => new Map(bubbleDistributionOptions.map((b) => [b.id, b])),
    [bubbleDistributionOptions],
  );

  const specs: GroupBySpec<ListRow>[] = useMemo(
    () =>
      groupBy.map((field) => {
        if (field === "bubble_distribution") {
          return {
            field,
            getKey: (row) => row.bubble_distribution_id ?? null,
            getLabel: (key) =>
              key == null
                ? "Unassigned"
                : bubbleById.get(key)?.name ?? "Unknown",
            keyOrder: bubbleDistributionOptions.map((b) => b.id),
          };
        }
        return {
          field: "tag",
          // Surface "Yes" first, otherwise first tag id
          getKey: (row) => {
            const yesTagId = tags.find((t) => t.name === "Yes")?.id;
            if (yesTagId && row.tag_ids.includes(yesTagId)) return yesTagId;
            return row.tag_ids[0] ?? null;
          },
          getLabel: (key) =>
            key == null ? "Untagged" : tagById.get(key)?.name ?? "Unknown",
          keyOrder: tagKeyOrder,
        };
      }),
    [
      groupBy,
      folderById,
      tagById,
      tags,
      tagKeyOrder,
      bubbleById,
      bubbleDistributionOptions,
    ],
  );

  const tree = useMemo(() => groupRows(rows, specs), [rows, specs]);

  // Build dynamic column keys: static fields + one column per folder, in
  // folder sort_order (already the order `folders` arrives in).
  const columnKeys = useMemo(() => {
    const folderKeys = folders.map((f) => `folder:${f.id}`);
    return [...STATIC_COLUMN_KEYS, ...folderKeys];
  }, [folders]);

  const headerLabels = useMemo(() => {
    const labels: Record<string, string> = { ...STATIC_HEADER_LABELS };
    for (const f of folders) {
      labels[`folder:${f.id}`] = f.name;
    }
    return labels;
  }, [folders]);

  const orderedKeys = useMemo(
    () => resolveColumnOrder(params.columnOrder, columnKeys),
    [params.columnOrder, columnKeys],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!orderedKeys.includes(activeId)) return;
    const oldIndex = orderedKeys.indexOf(activeId);
    const newIndex = orderedKeys.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;
    setColumnOrder(arrayMove(orderedKeys, oldIndex, newIndex));
  };

  const iceWidth = (level: number) => {
    const field = groupBy[level];
    return params.columnWidths[`__ice:${field}`] ?? ICICLE_WIDTH_DEFAULT;
  };

  const userColsWidth = orderedKeys.reduce(
    (sum, k) =>
      sum + (params.columnWidths[k] ?? LIST_DEFAULT_WIDTHS[k] ?? 200),
    0,
  );
  const iceColsWidth = Array.from({ length: iceLevels }).reduce<number>(
    (sum, _, i) => sum + iceWidth(i),
    0,
  );
  const totalWidth = userColsWidth + iceColsWidth;
  const totalColumnCount = iceLevels + orderedKeys.length;

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const cellRenderers: Record<string, (row: ListRow) => React.ReactNode> = {
    image: (row) => (
      <td key="image" className={cellClass} style={{ textAlign: "center" }}>
        <a href={row.public_url} target="_blank" rel="noreferrer" title={row.image_name}>
          {row.is_video ? (
            <video
              src={row.public_url}
              style={{ maxWidth: "100%", maxHeight: 100, borderRadius: "var(--radius-sm)" }}
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.public_url}
              alt={row.image_name}
              loading="lazy"
              style={{
                maxWidth: "100%",
                maxHeight: 100,
                borderRadius: "var(--radius-sm)",
                objectFit: "contain",
                display: "inline-block",
              }}
            />
          )}
        </a>
      </td>
    ),
    name: (row) => (
      <td key="name" className={cellClass}>
        <EditableText
          value={row.image_name}
          onSave={(v) => updateImageName(row.image_id, v)}
        />
        <span className="text-[color:var(--muted-foreground)] text-xs ml-1">
          .{row.ext}
        </span>
      </td>
    ),
    bubble_distribution: (row) => (
      <td key="bubble_distribution" className={cellClass}>
        <PillSelect
          value={row.bubble_distribution_id ?? ""}
          options={bubbleDistributionOptions}
          onSave={(v) => updateBubbleDistribution(row.image_id, v)}
          onCreate={(name) =>
            createPicklistOptionNamed("eagle_bubble_distributions", name)
          }
        />
      </td>
    ),
    tags: (row) => (
      <td key="tags" className={cellClass}>
        {row.tag_ids.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.tag_ids.map((tid) => {
              const t = tagById.get(tid);
              return (
                <Pill key={tid} color={null}>
                  {t?.name ?? tid}
                </Pill>
              );
            })}
          </div>
        )}
      </td>
    ),
  };

  // One PillSelect cell per folder. Status defaults to "Sort" (the absence
  // of a row in eagle_image_folders); picking Yes/No writes a row.
  const sortStatus = bubbleDistributionOptions.find((o) => o.name === "Sort");
  for (const folder of folders) {
    const key = `folder:${folder.id}`;
    cellRenderers[key] = (row) => {
      const currentStatus =
        row.folder_statuses[folder.id] ?? sortStatus?.id ?? "";
      return (
        <td key={key} className={cellClass}>
          <PillSelect
            value={currentStatus}
            options={bubbleDistributionOptions}
            onSave={(v) => setImageFolderStatus(row.image_id, folder.id, v)}
          />
        </td>
      );
    };
  }

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
          label: GROUPABLE_HEADER_LABELS[k] ?? k,
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
          className="text-[length:var(--cell-font-size)] [&_td]:align-middle"
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
            {orderedKeys.map((k) => (
              <col
                key={k}
                style={{ width: params.columnWidths[k] ?? LIST_DEFAULT_WIDTHS[k] }}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {Array.from({ length: iceLevels }).map((_, i) => (
                <th key={`ice-h-${i}`} className={headerClass} style={{ position: "relative" }}>
                  {GROUPABLE_HEADER_LABELS[groupBy[i]] ?? groupBy[i]}
                  <ColumnResizer
                    columnIndex={i}
                    currentWidth={iceWidth(i)}
                    onResize={(w) => setColumnWidth(`__ice:${groupBy[i]}`, w)}
                  />
                </th>
              ))}
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
                          params.columnWidths[k] ?? LIST_DEFAULT_WIDTHS[k] ?? 200
                        }
                        onResize={(w) => setColumnWidth(k, w)}
                      />
                    }
                  >
                    {headerLabels[k] ?? k}
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
            {iceLevels === 0
              ? rows.map((row) => (
                  <RowContextMenu
                    key={row.image_id}
                    onDelete={() => deleteImageFromList(row.image_id)}
                    itemLabel={`"${row.image_name}"`}
                  >
                    {orderedKeys.map((k) => cellRenderers[k]?.(row))}
                  </RowContextMenu>
                ))
              : renderTree(
                  tree,
                  collapsed,
                  toggleCollapsed,
                  iceLevels,
                  orderedKeys,
                  cellRenderers,
                  (row) => deleteImageFromList(row.image_id),
                  (group) => {
                    if (group.field === "bubble_distribution" && group.value) {
                      return bubbleById.get(group.value)?.color ?? null;
                    }
                    return null;
                  },
                )}
          </tbody>
        </table>
        </DndContext>
      </div>
    </>
  );
}

// ---------- Grouped rendering ----------

type FlatRow =
  | { kind: "data"; row: ListRow; path: GroupNode<ListRow>[] }
  | {
      kind: "collapsed";
      group: GroupNode<ListRow>;
      pathIncludingSelf: GroupNode<ListRow>[];
    };

function flatten(
  items: GroupItem<ListRow>[],
  collapsed: Set<string>,
  parentPath: GroupNode<ListRow>[],
): FlatRow[] {
  const out: FlatRow[] = [];
  for (const item of items) {
    if (item.kind === "group") {
      const pathInc = [...parentPath, item];
      if (collapsed.has(item.path)) {
        out.push({ kind: "collapsed", group: item, pathIncludingSelf: pathInc });
      } else {
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
  group: GroupNode<ListRow>;
}

function groupAtLevel(f: FlatRow, level: number): GroupNode<ListRow> | null {
  if (f.kind === "data") return f.path[level] ?? null;
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

function renderTree(
  tree: GroupItem<ListRow>[],
  collapsed: Set<string>,
  toggle: (path: string) => void,
  iceLevels: number,
  orderedKeys: string[],
  cellRenderers: Record<string, (row: ListRow) => React.ReactNode>,
  onDelete: (row: ListRow) => void | Promise<void>,
  colorFor: (group: GroupNode<ListRow>) => string | null,
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

      if (isCollapsedLevel) {
        const color = colorFor(span.group);
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
              <Pill color={color}>{span.group.label || "(unnamed)"}</Pill>
              <span className="text-[color:var(--muted-foreground)] text-xs">
                ({span.group.count})
              </span>
            </div>
          </td>,
        );
        collapsedRight = true;
        break;
      }

      const color = colorFor(span.group);
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
            <Pill color={color}>{span.group.label || "(unnamed)"}</Pill>
            <span className="text-[color:var(--muted-foreground)] text-xs ml-1">
              ({span.group.count})
            </span>
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

    const row = frow.row;
    out.push(
      <RowContextMenu
        key={row.image_id}
        onDelete={() => onDelete(row)}
        itemLabel={`"${row.image_name}"`}
      >
        {icicleCells}
        {orderedKeys.map((k) => cellRenderers[k]?.(row))}
      </RowContextMenu>,
    );
  }

  return out;
}
