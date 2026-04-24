"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Empty } from "@/components/empty";
import { Pill, PillSelect, type PillOption } from "@/components/pill";
import { updateBubbleDistribution } from "./actions";
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
  folder_ids: string[];
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

const GROUPABLE_KEYS = ["folder", "tag", "bubble_distribution"] as const;
type GroupField = (typeof GROUPABLE_KEYS)[number];

const HEADER_LABELS: Record<string, string> = {
  folder: "Folder",
  tag: "Tag",
  bubble_distribution: "Bubble Distribution",
  image: "Image",
  name: "Name",
  folders: "Folders",
  tags: "Tags",
};

const COLUMN_KEYS = ["image", "name", "bubble_distribution", "folders", "tags"] as const;

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
        if (field === "folder") {
          return {
            field,
            getKey: (row) => row.folder_ids[0] ?? null,
            getLabel: (key) =>
              key == null
                ? "No folder"
                : folderById.get(key)?.full_path ??
                  folderById.get(key)?.name ??
                  "Unknown",
          };
        }
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

  const orderedKeys = useMemo(
    () =>
      resolveColumnOrder(params.columnOrder, COLUMN_KEYS as readonly string[]),
    [params.columnOrder],
  );

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
        <span className="text-foreground">{row.image_name}</span>
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
    folders: (row) => (
      <td key="folders" className={cellClass}>
        {row.folder_ids.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.folder_ids.map((fid) => {
              const f = folderById.get(fid);
              return (
                <Pill key={fid} color={f?.color ?? null}>
                  {f?.name ?? fid}
                </Pill>
              );
            })}
          </div>
        )}
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
        <table
          className="text-[length:var(--cell-font-size)] [&_td]:align-middle"
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
                  {HEADER_LABELS[groupBy[i]] ?? groupBy[i]}
                  <ColumnResizer
                    columnIndex={i}
                    currentWidth={iceWidth(i)}
                    onResize={(w) => setColumnWidth(`__ice:${groupBy[i]}`, w)}
                  />
                </th>
              ))}
              {orderedKeys.map((k, i) => (
                <th key={k} className={headerClass} style={{ position: "relative" }}>
                  {HEADER_LABELS[k] ?? k}
                  <ColumnResizer
                    columnIndex={i + iceLevels}
                    currentWidth={
                      params.columnWidths[k] ?? LIST_DEFAULT_WIDTHS[k] ?? 200
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
            {iceLevels === 0
              ? rows.map((row) => (
                  <tr key={row.image_id}>
                    {orderedKeys.map((k) => cellRenderers[k]?.(row))}
                  </tr>
                ))
              : renderTree(
                  tree,
                  collapsed,
                  toggleCollapsed,
                  iceLevels,
                  orderedKeys,
                  cellRenderers,
                )}
          </tbody>
        </table>
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
            <span className="font-[number:var(--font-weight-medium)]">
              {span.group.label || "(unnamed)"}
            </span>
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
      <tr key={row.image_id}>
        {icicleCells}
        {orderedKeys.map((k) => cellRenderers[k]?.(row))}
      </tr>,
    );
  }

  return out;
}
