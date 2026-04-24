"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { RowContextMenu } from "@/components/row-context-menu";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
import {
  bulkDeleteImages,
  bulkSetBubbleDistribution,
  bulkSetImageFolderStatus,
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

const STATIC_COLUMN_KEYS = [
  "select",
  "image",
  "name",
  "bubble_distribution",
  "tags",
] as const;

const STATIC_HEADER_LABELS: Record<string, string> = {
  select: "",
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

  // Build the unified flat list once: ungrouped is just the data rows; grouped
  // includes data + collapsed-summary + add-row markers from flatten().
  const flatRows: FlatRow[] = useMemo(() => {
    if (iceLevels === 0) {
      return rows.map((row) => ({ kind: "data", row, path: [] }));
    }
    return flatten(tree, collapsed, []);
  }, [iceLevels, rows, tree, collapsed]);

  // Pre-compute icicle spans per level for grouped rendering.
  const spanCoverage: Map<number, LevelSpan>[] = useMemo(() => {
    const result: Map<number, LevelSpan>[] = [];
    for (let L = 0; L < iceLevels; L++) {
      const spans = computeSpans(flatRows, L);
      const map = new Map<number, LevelSpan>();
      for (const s of spans) {
        for (let i = s.startIndex; i < s.startIndex + s.rowSpan; i++) {
          map.set(i, s);
        }
      }
      result.push(map);
    }
    return result;
  }, [flatRows, iceLevels]);

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [lightbox, setLightbox] = useState<{
    url: string;
    name: string;
    isVideo: boolean;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPicker, setBulkPicker] = useState<
    | { kind: "bubble" }
    | { kind: "folder"; folderId: string; folderName: string }
    | null
  >(null);
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => {
    setSelectedIds(new Set(rows.map((r) => r.image_id)));
  };
  useEffect(() => {
    if (tableWrapperRef.current) {
      setScrollMargin(tableWrapperRef.current.offsetTop);
    }
  }, []);
  // Row heights vary because the Image column displays full-width images at
  // their natural aspect ratio. Use the image's known dimensions for the
  // per-row size estimate so initial scroll positions are close to right.
  const imageColWidth =
    params.columnWidths.image ?? LIST_DEFAULT_WIDTHS.image ?? 140;
  const rowVirtualizer = useWindowVirtualizer({
    count: flatRows.length,
    estimateSize: (index) => {
      const f = flatRows[index];
      if (!f || f.kind !== "data") return 48;
      const r = f.row;
      if (r.width && r.height && r.width > 0) {
        return Math.round((imageColWidth * r.height) / r.width);
      }
      return imageColWidth; // square fallback
    },
    overscan: 8,
    scrollMargin,
  });

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const cellRenderers: Record<string, (row: ListRow) => React.ReactNode> = {
    select: (row) => (
      <td
        key="select"
        className={cellClass}
        style={{ textAlign: "center", verticalAlign: "top" }}
      >
        <input
          type="checkbox"
          checked={selectedIds.has(row.image_id)}
          onChange={() => toggleSelected(row.image_id)}
          aria-label={`Select ${row.image_name}`}
        />
      </td>
    ),
    image: (row) => (
      <td
        key="image"
        className="bg-[color:var(--cell-bg)]"
        style={{ padding: 0, verticalAlign: "top" }}
      >
        <button
          type="button"
          onClick={() =>
            setLightbox({
              url: row.public_url,
              name: row.image_name,
              isVideo: row.is_video,
            })
          }
          title={`${row.image_name} — click to enlarge`}
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            border: 0,
            background: "transparent",
            cursor: "zoom-in",
            lineHeight: 0,
          }}
        >
          {row.is_video ? (
            <video
              src={row.public_url}
              style={{ width: "100%", height: "auto", display: "block" }}
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.public_url}
              alt={row.image_name}
              loading="lazy"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          )}
        </button>
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
            createPicklistOptionNamed("inf_images_bubble_distributions", name)
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
  // of a row in inf_images_folder_links); picking Yes/No writes a row.
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
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onClear={clearSelection}
          onSelectAll={selectAllVisible}
          totalCount={rows.length}
          folders={folders}
          onPickBubble={() => setBulkPicker({ kind: "bubble" })}
          onPickFolder={(f) =>
            setBulkPicker({ kind: "folder", folderId: f.id, folderName: f.name })
          }
          onDelete={() => {
            const ids = [...selectedIds];
            if (ids.length === 0) return;
            const ok = window.confirm(
              `Delete ${ids.length} image${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
            );
            if (!ok) return;
            void bulkDeleteImages(ids).then(() => clearSelection());
          }}
        />
      )}
      <div ref={tableWrapperRef} className="overflow-x-auto">
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
            {(() => {
              const items = rowVirtualizer.getVirtualItems();
              const total = rowVirtualizer.getTotalSize();
              const first = items[0];
              const last = items[items.length - 1];
              const offsetTop = first ? first.start - scrollMargin : 0;
              const offsetBottom = last && first ? total - last.end : 0;
              const firstIdx = first?.index ?? 0;
              const lastIdx = last?.index ?? -1;

              const colorFor = (group: GroupNode<ListRow>) => {
                if (group.field === "bubble_distribution" && group.value) {
                  return bubbleById.get(group.value)?.color ?? null;
                }
                return null;
              };

              const out: React.ReactNode[] = [];
              if (offsetTop > 0) {
                out.push(
                  <tr key="vrow-top" aria-hidden="true">
                    <td
                      colSpan={totalColumnCount}
                      style={{ height: offsetTop, padding: 0, background: "transparent" }}
                    />
                  </tr>,
                );
              }

              for (const v of items) {
                const i = v.index;
                const frow = flatRows[i];
                if (!frow) continue;

                // Build icicle cells, clipped to the visible window.
                const icicleCells: React.ReactNode[] = [];
                let collapsedRight = false;
                for (let L = 0; L < iceLevels; L++) {
                  const span = spanCoverage[L].get(i);
                  if (!span) continue;
                  // Render the icicle on the FIRST visible row of this span.
                  const visibleStart = Math.max(span.startIndex, firstIdx);
                  const visibleEnd = Math.min(
                    span.startIndex + span.rowSpan - 1,
                    lastIdx,
                  );
                  if (i !== visibleStart) continue;
                  const visRowSpan = visibleEnd - visibleStart + 1;
                  const isCollapsedLevel =
                    frow.kind === "collapsed" && frow.group.level === L;
                  if (isCollapsedLevel) {
                    const color = colorFor(span.group);
                    icicleCells.push(
                      <td
                        key={`ice-${L}`}
                        rowSpan={visRowSpan}
                        colSpan={iceLevels - L + orderedKeys.length}
                        className="themed-group-merged-cell cursor-pointer select-none"
                        onClick={() => toggleCollapsed(span.group.path)}
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
                      rowSpan={visRowSpan}
                      className="themed-group-merged-cell cursor-pointer select-none"
                      onClick={() => toggleCollapsed(span.group.path)}
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
                    <tr key={`c-${frow.group.path}-${i}`} className="themed-group-row">
                      {icicleCells}
                    </tr>,
                  );
                  continue;
                }

                // Data row
                const row = frow.row;
                out.push(
                  <RowContextMenu
                    key={row.image_id}
                    onDelete={() => deleteImageFromList(row.image_id)}
                    itemLabel={`"${row.image_name}"`}
                  >
                    {icicleCells}
                    {orderedKeys.map((k) => cellRenderers[k]?.(row))}
                  </RowContextMenu>,
                );
              }

              if (offsetBottom > 0) {
                out.push(
                  <tr key="vrow-bottom" aria-hidden="true">
                    <td
                      colSpan={totalColumnCount}
                      style={{ height: offsetBottom, padding: 0, background: "transparent" }}
                    />
                  </tr>,
                );
              }
              return out;
            })()}
          </tbody>
        </table>
        </DndContext>
      </div>
      <BulkPickerDialog
        picker={bulkPicker}
        onClose={() => setBulkPicker(null)}
        bubbleOptions={bubbleDistributionOptions}
        selectedIds={[...selectedIds]}
        onApplyBubble={(statusId) => {
          void bulkSetBubbleDistribution([...selectedIds], statusId);
          setBulkPicker(null);
          clearSelection();
        }}
        onApplyFolder={(folderId, statusId) => {
          void bulkSetImageFolderStatus([...selectedIds], folderId, statusId);
          setBulkPicker(null);
          clearSelection();
        }}
      />
      <Dialog
        open={lightbox !== null}
        onOpenChange={(o) => {
          if (!o) setLightbox(null);
        }}
      >
        <DialogContent
          className="sm:max-w-[min(95vw,1600px)] p-0 overflow-hidden bg-transparent border-0 shadow-none"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {lightbox?.name ?? "Image preview"}
          </DialogTitle>
          {lightbox &&
            (lightbox.isVideo ? (
              <video
                src={lightbox.url}
                controls
                autoPlay
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "90vh",
                  display: "block",
                  background: "#000",
                }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.url}
                alt={lightbox.name}
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "90vh",
                  display: "block",
                  objectFit: "contain",
                }}
              />
            ))}
        </DialogContent>
      </Dialog>
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

// ---------- Bulk action bar ----------

function BulkActionBar({
  count,
  totalCount,
  onClear,
  onSelectAll,
  folders,
  onPickBubble,
  onPickFolder,
  onDelete,
}: {
  count: number;
  totalCount: number;
  onClear: () => void;
  onSelectAll: () => void;
  folders: FolderOption[];
  onPickBubble: () => void;
  onPickFolder: (f: FolderOption) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-2 px-3 py-2 rounded-md"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      <span className="text-sm">
        <strong>{count}</strong> selected
        {count < totalCount && (
          <button
            type="button"
            className="themed-link ml-2"
            onClick={onSelectAll}
          >
            Select all {totalCount}
          </button>
        )}
      </span>
      <span className="text-[color:var(--muted-foreground)] text-sm">
        Set:
      </span>
      <button
        type="button"
        className="themed-button-sm"
        onClick={onPickBubble}
      >
        Bubble Distribution…
      </button>
      <details className="relative">
        <summary
          className="themed-button-sm cursor-pointer list-none"
          style={{ display: "inline-block" }}
        >
          Folder…
        </summary>
        <div
          className="absolute z-10 mt-1 max-h-[300px] overflow-y-auto rounded-md p-1"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--dropdown-shadow)",
            minWidth: 220,
          }}
        >
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              className="block w-full text-left px-2 py-1 text-sm rounded-sm hover:bg-[color:var(--accent)]"
              onClick={() => onPickFolder(f)}
            >
              {f.name}
            </button>
          ))}
        </div>
      </details>
      <button
        type="button"
        className="themed-button-sm ml-auto"
        onClick={onDelete}
        style={{
          color: "var(--destructive, #b91c1c)",
          borderColor: "var(--destructive, #b91c1c)",
        }}
      >
        Delete…
      </button>
      <button
        type="button"
        className="themed-button-sm"
        onClick={onClear}
      >
        Clear selection
      </button>
    </div>
  );
}

function BulkPickerDialog({
  picker,
  onClose,
  bubbleOptions,
  selectedIds,
  onApplyBubble,
  onApplyFolder,
}: {
  picker:
    | { kind: "bubble" }
    | { kind: "folder"; folderId: string; folderName: string }
    | null;
  onClose: () => void;
  bubbleOptions: PillOption[];
  selectedIds: string[];
  onApplyBubble: (statusId: string) => void;
  onApplyFolder: (folderId: string, statusId: string) => void;
}) {
  const open = picker !== null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogTitle>
          {picker?.kind === "folder"
            ? `Set "${picker.folderName}" on ${selectedIds.length} image${
                selectedIds.length === 1 ? "" : "s"
              }`
            : `Set Bubble Distribution on ${selectedIds.length} image${
                selectedIds.length === 1 ? "" : "s"
              }`}
        </DialogTitle>
        <div className="flex flex-wrap gap-2 mt-3">
          {bubbleOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
              onClick={() => {
                if (picker?.kind === "folder") {
                  onApplyFolder(picker.folderId, opt.id);
                } else if (picker?.kind === "bubble") {
                  onApplyBubble(opt.id);
                }
              }}
            >
              <Pill color={opt.color}>{opt.name}</Pill>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

