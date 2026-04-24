"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { EditableTextWrap } from "@/components/editable-text";
import {
  useTableViews,
  resolveColumnOrder,
  type ViewParams,
} from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { GroupByPicker } from "@/components/group-by-picker";
import { RowContextMenu } from "@/components/row-context-menu";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
import {
  groupRows,
  type GroupBySpec,
  type GroupItem,
  type GroupNode,
} from "@/lib/table-grouping";
import {
  createNote,
  deleteImage,
  deleteNote,
  updateNote,
  upsertNoteForImage,
} from "./actions";
import { EAGLE_STORAGE_KEY, EAGLE_DEFAULT_WIDTHS } from "./config";

export interface EagleRow {
  image_id: string;
  eagle_id: string;
  image_name: string;
  ext: string;
  width: number | null;
  height: number | null;
  public_url: string;
  is_video: boolean;
  folder_ids: string[];
  tag_ids: string[];
  note_id: string | null;
  note: string | null;
  sort_order: number | null;
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

const GROUPABLE_KEYS = ["folder", "tag"] as const;
type GroupField = (typeof GROUPABLE_KEYS)[number];

const HEADER_LABELS: Record<string, string> = {
  folder: "Folder",
  tag: "Tag",
  image: "Image",
  note: "Note",
};

const ICICLE_WIDTH_DEFAULT = 200;
const IMAGE_ICICLE_WIDTH_DEFAULT = 280;

const COLUMN_KEYS = ["note"] as const;

export function EagleImagesTable({
  rows,
  folders,
  tags,
  initialParams,
}: {
  rows: EagleRow[];
  folders: FolderOption[];
  tags: TagOption[];
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
  } = useTableViews(EAGLE_STORAGE_KEY, EAGLE_DEFAULT_WIDTHS, initialParams);

  const upperGroupBy = useMemo(
    () =>
      (params.groupBy ?? []).filter((k): k is GroupField =>
        (GROUPABLE_KEYS as readonly string[]).includes(k),
      ),
    [params.groupBy],
  );

  // Image is always the innermost icicle; user-chosen groups sit above.
  const groupBy: string[] = useMemo(
    () => [...upperGroupBy, "image"],
    [upperGroupBy],
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

  const specs: GroupBySpec<EagleRow>[] = useMemo(
    () =>
      groupBy.map((field) => {
        if (field === "folder") {
          return {
            field,
            getKey: (row) => row.folder_ids[0] ?? null,
            getLabel: (key) =>
              key == null
                ? "No folder"
                : folderById.get(key)?.full_path ?? folderById.get(key)?.name ?? "Unknown",
          };
        }
        if (field === "tag") {
          return {
            field,
            getKey: (row) => row.tag_ids[0] ?? null,
            getLabel: (key) =>
              key == null ? "Untagged" : tagById.get(key)?.name ?? "Unknown",
          };
        }
        // image
        return {
          field: "image",
          getKey: (row) => row.image_id,
          getLabel: (_key, rowsForGroup) => rowsForGroup[0]?.image_name ?? "",
        };
      }),
    [groupBy, folderById, tagById],
  );

  const tree = useMemo(() => groupRows(rows, specs), [rows, specs]);

  const orderedKeys = useMemo(
    () =>
      resolveColumnOrder(params.columnOrder, COLUMN_KEYS as readonly string[]),
    [params.columnOrder],
  );

  const iceWidth = (level: number) => {
    const field = groupBy[level];
    const key = `__ice:${field}`;
    const saved = params.columnWidths[key];
    if (saved != null) return saved;
    return field === "image" ? IMAGE_ICICLE_WIDTH_DEFAULT : ICICLE_WIDTH_DEFAULT;
  };

  const userColsWidth = orderedKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? EAGLE_DEFAULT_WIDTHS[k] ?? 320),
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
        groupBy={upperGroupBy}
        onChange={(next) => setGroupBy(next)}
      />
      <div className="overflow-x-auto">
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
            {orderedKeys.map((k) => (
              <col
                key={k}
                style={{ width: params.columnWidths[k] ?? EAGLE_DEFAULT_WIDTHS[k] }}
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
              {orderedKeys.map((k, i) => (
                <th
                  key={k}
                  className={headerClass}
                  style={{ position: "relative" }}
                >
                  {HEADER_LABELS[k]}
                  <ColumnResizer
                    columnIndex={i + iceLevels}
                    currentWidth={
                      params.columnWidths[k] ?? EAGLE_DEFAULT_WIDTHS[k] ?? 320
                    }
                    onResize={(w) => setColumnWidth(k, w)}
                  />
                </th>
              ))}
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
            {renderTree(
              tree,
              collapsed,
              toggleCollapsed,
              iceLevels,
              orderedKeys,
              cellClass,
              totalColumnCount,
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------- Rendering ----------

type FlatRow =
  | { kind: "data"; row: EagleRow; path: GroupNode<EagleRow>[] }
  | {
      kind: "collapsed";
      group: GroupNode<EagleRow>;
      pathIncludingSelf: GroupNode<EagleRow>[];
    }
  | {
      kind: "add";
      group: GroupNode<EagleRow>; // innermost (image) group
      path: GroupNode<EagleRow>[];
    };

function flatten(
  items: GroupItem<EagleRow>[],
  collapsed: Set<string>,
  parentPath: GroupNode<EagleRow>[],
): FlatRow[] {
  const out: FlatRow[] = [];
  for (const item of items) {
    if (item.kind === "group") {
      const pathInc = [...parentPath, item];
      if (collapsed.has(item.path)) {
        out.push({ kind: "collapsed", group: item, pathIncludingSelf: pathInc });
      } else {
        const isInnermost = item.children.every((c) => c.kind === "row");
        out.push(...flatten(item.children, collapsed, pathInc));
        if (isInnermost) {
          out.push({ kind: "add", group: item, path: pathInc });
        }
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
  group: GroupNode<EagleRow>;
}

function groupAtLevel(f: FlatRow, level: number): GroupNode<EagleRow> | null {
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

function renderTree(
  tree: GroupItem<EagleRow>[],
  collapsed: Set<string>,
  toggle: (path: string) => void,
  iceLevels: number,
  orderedKeys: string[],
  cellClass: string,
  totalColumnCount: number,
): React.ReactNode[] {
  const flat = flatten(tree, collapsed, []);

  const spanStartAt: Map<number, LevelSpan>[] = [];
  for (let L = 0; L < iceLevels; L++) {
    const spans = computeSpans(flat, L);
    const map = new Map<number, LevelSpan>();
    for (const s of spans) map.set(s.startIndex, s);
    spanStartAt.push(map);
  }

  const imageLevel = iceLevels - 1; // image is always innermost

  const out: React.ReactNode[] = [];
  for (let i = 0; i < flat.length; i++) {
    const frow = flat[i];
    const icicleCells: React.ReactNode[] = [];
    let collapsedRight = false;

    for (let L = 0; L < iceLevels; L++) {
      const span = spanStartAt[L].get(i);
      if (!span) continue;

      const isCollapsed =
        frow.kind === "collapsed" && frow.group.level === L;

      if (isCollapsed) {
        const Caret = ChevronRight;
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
              <Caret className="w-3 h-3 shrink-0" />
              <span className="font-[number:var(--font-weight-medium)]">
                {span.group.label || "(unnamed)"}
              </span>
              <span className="text-[color:var(--muted-foreground)] text-xs">
                ({span.group.count})
              </span>
            </div>
          </td>,
        );
        collapsedRight = true;
        break;
      }

      const isImageLevel = L === imageLevel;
      const sampleRow = firstRowOfGroup(span.group);
      icicleCells.push(
        <td
          key={`ice-${L}`}
          rowSpan={span.rowSpan}
          className={
            isImageLevel
              ? `${cellClass} cursor-pointer`
              : "themed-group-merged-cell cursor-pointer select-none"
          }
          onClick={() => toggle(span.group.path)}
          title={isImageLevel ? sampleRow?.image_name : "Collapse"}
          style={isImageLevel ? { textAlign: "center" } : undefined}
        >
          {isImageLevel ? (
            sampleRow ? (
              <ImageThumb row={sampleRow} />
            ) : null
          ) : (
            <div className="flex items-start gap-1">
              <ChevronDown className="w-3 h-3 mt-1 shrink-0" />
              <span className="font-[number:var(--font-weight-medium)]">
                {span.group.label || "(unnamed)"}
              </span>
            </div>
          )}
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
      const imageId = (frow.group as GroupNode<EagleRow>).value;
      if (imageId == null) {
        continue; // shouldn't happen for image-level group
      }
      out.push(
        <tr key={`add-${frow.group.path}`}>
          {icicleCells}
          <td
            colSpan={orderedKeys.length}
            className="themed-new-row-cell"
            onClick={() => createNote(imageId)}
            title="Add note for this image"
          >
            + Add note
          </td>
        </tr>,
      );
      continue;
    }

    // data row
    const row = frow.row;
    out.push(
      <RowContextMenu
        key={`${row.image_id}:${row.note_id ?? "empty"}`}
        onDelete={() =>
          row.note_id ? deleteNote(row.note_id) : deleteImage(row.image_id)
        }
        itemLabel={row.note_id ? "this note" : `"${row.image_name}"`}
      >
        {icicleCells}
        <td className={cellClass}>
          <EditableTextWrap
            value={row.note ?? ""}
            onSave={(v) =>
              row.note_id
                ? updateNote(row.note_id, v)
                : upsertNoteForImage(row.image_id, v)
            }
          />
        </td>
      </RowContextMenu>,
    );
  }

  // Decorative spacer if empty
  if (out.length === 0) {
    out.push(
      <tr key="empty">
        <td
          colSpan={totalColumnCount}
          className="text-center text-[color:var(--muted-foreground)] py-8"
        >
          No images imported yet.
        </td>
      </tr>,
    );
  }

  return out;
}

function firstRowOfGroup(group: GroupNode<EagleRow>): EagleRow | null {
  for (const c of group.children) {
    if (c.kind === "row") return c.row;
    const nested = firstRowOfGroup(c);
    if (nested) return nested;
  }
  return null;
}

function ImageThumb({ row }: { row: EagleRow }) {
  if (row.is_video) {
    return (
      <video
        src={row.public_url}
        style={{
          maxWidth: "100%",
          maxHeight: 200,
          borderRadius: "var(--radius-sm)",
        }}
        controls
        preload="metadata"
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={row.public_url}
      alt={row.image_name}
      style={{
        maxWidth: "100%",
        maxHeight: 200,
        borderRadius: "var(--radius-sm)",
        objectFit: "contain",
        display: "block",
        margin: "0 auto",
      }}
      loading="lazy"
    />
  );
}
