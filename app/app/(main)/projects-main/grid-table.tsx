"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { format, parse } from "date-fns";
import { GripVertical } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Subtitle } from "@/components/subtitle";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskRow, StatusOption } from "./page";
import {
  updateTaskField,
  updateProjectField,
  finalizeProject,
  createTask,
  createProject,
  deleteTask,
  deleteProject,
  moveTask,
  reorderProjectsInTickleDate,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";
import { Pill, PillSelect, PILL_CLASS } from "@/components/pill";

const createUberProjectOption = (name: string) =>
  createPicklistOptionNamed("uber_projects", name);
const createProjectStatusOption = (name: string) =>
  createPicklistOptionNamed("project_statuses", name);
const createActionOrderStatusOption = (name: string) =>
  createPicklistOptionNamed("project_action_order_statuses", name);
const createTaskStatusOption = (name: string) =>
  createPicklistOptionNamed("task_statuses", name);
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useTableViews,
  resolveColumnOrder,
  type ViewParams,
} from "@/components/table-views";
import {
  PROJECTS_MAIN_STORAGE_KEY,
  PROJECTS_MAIN_DEFAULT_WIDTHS,
} from "./config";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
import { GroupByPicker } from "@/components/group-by-picker";

// Project-level icicle columns (rowspan-merged, pinned — not reorderable).
// "grip" is a narrow column with the drag handle for reordering projects
// within a tickle-date group.
const PROJECT_ICICLE_KEYS = [
  "grip",
  "project",
  "tickle",
  "uber_project",
  "project_status",
  "action_order_status",
] as const;

// Task-level columns (per-row, user-reorderable).
const TASK_COMMON_KEYS = ["task", "task_status", "result", "notes"] as const;

const HEADER_LABELS: Record<string, string> = {
  grip: "",
  project: "Project",
  tickle: "Tickle",
  uber_project: "Uber Project",
  project_status: "Project Status",
  action_order_status: "Action Order",
  task: "Task",
  task_status: "Task Status",
  result: "Result",
  notes: "Notes",
};

// Project-level fields that users may nest the grid under. Grouping re-sorts
// projects (as a block of task rows) by the picked field(s) and renders a
// left-side icicle for each level above the existing project icicles.
const GROUPABLE_KEYS = [
  "tickle",
  "uber_project",
  "project_status",
  "action_order_status",
] as const;
type GroupableKey = (typeof GROUPABLE_KEYS)[number];

const GROUP_ACCESSORS: Record<
  GroupableKey,
  { id: (r: TaskRow) => string | null; label: (r: TaskRow) => string; color: (r: TaskRow) => string | null | undefined }
> = {
  tickle: {
    id: (r) => r.tickle_date ?? null,
    label: (r) => {
      if (!r.tickle_date) return "No tickle date";
      const d = parse(r.tickle_date, "yyyy-MM-dd", new Date());
      return format(d, "EEE, MMM d");
    },
    color: () => null,
  },
  uber_project: {
    id: (r) => r.uber_project_id ?? null,
    label: (r) => r.uber_project ?? "(none)",
    color: (r) => r.uber_color,
  },
  project_status: {
    id: (r) => r.project_status_id ?? null,
    label: (r) => r.project_status ?? "(none)",
    color: (r) => r.project_color,
  },
  action_order_status: {
    id: (r) => r.action_order_status_id ?? null,
    label: (r) => r.action_order_status ?? "Uncategorized",
    color: (r) => r.action_order_color,
  },
};

const ICICLE_GROUP_WIDTH = 160;

const DEFAULT_COLUMN_WIDTHS = PROJECTS_MAIN_DEFAULT_WIDTHS;

interface GroupSpan {
  value: string;
  rowSpan: number;
  startIndex: number;
  color?: string;
  extra?: Record<string, unknown>;
}

function computeGroupSpans(
  data: TaskRow[],
  accessor: (row: TaskRow) => string,
  colorAccessor?: (row: TaskRow) => string,
  extraAccessor?: (row: TaskRow) => Record<string, unknown>,
  parentAccessors?: ((row: TaskRow) => string)[]
): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let current: GroupSpan | null = null;

  data.forEach((row, i) => {
    const val = accessor(row) || "(none)";
    let parentChanged = false;
    if (parentAccessors && i > 0) {
      parentChanged = parentAccessors.some(
        (pa) => (pa(data[i]) || "(none)") !== (pa(data[i - 1]) || "(none)")
      );
    }
    if (!current || current.value !== val || parentChanged) {
      if (current) spans.push(current);
      current = {
        value: val,
        rowSpan: 1,
        startIndex: i,
        color: colorAccessor?.(row),
        extra: extraAccessor?.(row),
      };
    } else {
      current.rowSpan++;
    }
  });
  if (current) spans.push(current);
  return spans;
}

export function GridTable({
  data,
  taskStatuses,
  projectStatuses,
  actionOrderStatuses,
  uberProjects,
  wrapped = true,
  title = "Projects",
  initialParams,
}: {
  data: TaskRow[];
  taskStatuses: StatusOption[];
  projectStatuses: StatusOption[];
  actionOrderStatuses: StatusOption[];
  uberProjects: StatusOption[];
  wrapped?: boolean;
  title?: string;
  initialParams?: ViewParams;
}) {
  const projectAccessor = (r: TaskRow) => r.project;

  // Per-project "dirty" tray: projects you've edited (or just created) float
  // to the top in the order they became dirty and stay put until committed.
  // Committed projects render in normal SQL order below.
  const [dirtyProjectIds, setDirtyProjectIds] = useState<string[]>([]);
  type DeleteConfirm =
    | { kind: "task"; id: string; name: string }
    | { kind: "project"; id: string; name: string }
    | null;
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const dirtyTaskOrderRef = useRef<Map<string, string[]>>(new Map());
  const prevProjectIdsRef = useRef<Set<string> | null>(null);

  const markProjectDirty = (projectId: string) => {
    if (!dirtyTaskOrderRef.current.has(projectId)) {
      const tasks = data
        .filter((r) => r.project_id === projectId)
        .map((r) => r.id);
      dirtyTaskOrderRef.current.set(projectId, tasks);
    }
    setDirtyProjectIds((prev) =>
      prev.includes(projectId) ? prev : [projectId, ...prev],
    );
  };

  const changeProjectStatus = (projectId: string, statusId: string) => {
    const next = projectStatuses.find((s) => s.id === statusId);
    if (next && next.name !== "Active") markProjectDirty(projectId);
    return updateProjectField(projectId, "status_id", statusId);
  };

  const commitProject = (projectId: string) => {
    const isDraft = data.some(
      (r) => r.project_id === projectId && r.project_is_draft,
    );
    dirtyTaskOrderRef.current.delete(projectId);
    setDirtyProjectIds((prev) => prev.filter((id) => id !== projectId));
    if (isDraft) void finalizeProject(projectId);
  };

  const commitAll = () => {
    const draftIds = dirtyProjectIds.filter((id) =>
      data.some((r) => r.project_id === id && r.project_is_draft),
    );
    dirtyTaskOrderRef.current.clear();
    setDirtyProjectIds([]);
    for (const id of draftIds) void finalizeProject(id);
  };

  // Detect newly-appeared project ids (and any inbox-promoted ids saved
  // in sessionStorage) and auto-mark them dirty so they land in the
  // tray. Edits to projects that are already in the sorted population
  // do NOT flow through here — those re-sort naturally in SQL order.
  useLayoutEffect(() => {
    const currentIds = new Set(data.map((r) => r.project_id));
    if (prevProjectIdsRef.current === null) {
      prevProjectIdsRef.current = currentIds;
      // Pick up any project ids stashed by the Inbox "Projects" button.
      if (typeof window !== "undefined") {
        const TRAY_KEY = "projects-main:tray";
        let stashed: string[] = [];
        try {
          const raw = sessionStorage.getItem(TRAY_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              stashed = parsed.filter(
                (v): v is string => typeof v === "string",
              );
            }
          }
        } catch {
          stashed = [];
        }
        sessionStorage.removeItem(TRAY_KEY);
        const toAdd = stashed.filter((id) => currentIds.has(id));
        if (toAdd.length > 0) {
          for (const pid of toAdd) {
            if (!dirtyTaskOrderRef.current.has(pid)) {
              const tasks = data
                .filter((r) => r.project_id === pid)
                .map((r) => r.id);
              dirtyTaskOrderRef.current.set(pid, tasks);
            }
          }
          setDirtyProjectIds((prev) => {
            const existing = new Set(prev);
            const fresh = toAdd.filter((id) => !existing.has(id));
            if (fresh.length === 0) return prev;
            return [...fresh, ...prev];
          });
        }
      }
      return;
    }
    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevProjectIdsRef.current.has(id)) newIds.push(id);
    }
    prevProjectIdsRef.current = currentIds;
    if (newIds.length === 0) return;
    for (const pid of newIds) {
      if (!dirtyTaskOrderRef.current.has(pid)) {
        const tasks = data
          .filter((r) => r.project_id === pid)
          .map((r) => r.id);
        dirtyTaskOrderRef.current.set(pid, tasks);
      }
    }
    setDirtyProjectIds((prev) => {
      const existing = new Set(prev);
      const toAdd = newIds.filter((id) => !existing.has(id));
      if (toAdd.length === 0) return prev;
      return [...toAdd, ...prev];
    });
  }, [data]);

  const dirtySet = useMemo(
    () => new Set(dirtyProjectIds),
    [dirtyProjectIds],
  );

  // Tracks the in-flight drag across dragstart/dragover/drop. Can't use
  // dataTransfer.getData() inside dragover in Chrome for security reasons,
  // so a ref holds what we need.
  const dragState = useRef<{
    projectId: string;
    tickleDate: string | null;
  } | null>(null);

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
  } = useTableViews(PROJECTS_MAIN_STORAGE_KEY, DEFAULT_COLUMN_WIDTHS, initialParams);

  const groupBy = useMemo(
    () =>
      (params.groupBy ?? []).filter((k): k is GroupableKey =>
        (GROUPABLE_KEYS as readonly string[]).includes(k),
      ),
    [params.groupBy],
  );

  const orderedData = useMemo(() => {
    // Server now returns all projects regardless of status; hide non-Active
    // projects on the client UNLESS they're dirty (so setting a project's
    // status to Abandoned doesn't yank it from view before Commit).
    const visible = data.filter(
      (row) =>
        row.project_status === "Active" || dirtySet.has(row.project_id),
    );
    if (dirtyProjectIds.length === 0) return visible;
    const byProject = new Map<string, TaskRow[]>();
    for (const row of visible) {
      if (!byProject.has(row.project_id)) byProject.set(row.project_id, []);
      byProject.get(row.project_id)!.push(row);
    }
    // Render the dirty tray in stable project_id order so editing the Project
    // name (which re-sorts the upstream SQL result) can't reshuffle the tray.
    const sortedDirtyIds = [...dirtyProjectIds].sort();
    const result: TaskRow[] = [];
    for (const pid of sortedDirtyIds) {
      const rows = byProject.get(pid) ?? [];
      const snapshotTaskIds = dirtyTaskOrderRef.current.get(pid) ?? [];
      const taskIndex = new Map(snapshotTaskIds.map((id, i) => [id, i]));
      const known: Array<{ idx: number; row: TaskRow }> = [];
      const fresh: TaskRow[] = [];
      for (const row of rows) {
        const idx = taskIndex.get(row.id);
        if (idx !== undefined) known.push({ idx, row });
        else fresh.push(row);
      }
      known.sort((a, b) => a.idx - b.idx);
      // Stable sort for fresh tasks too — server task order can shift when
      // status/order/name changes, and we don't want that to reshuffle tasks
      // inside a pending tray row.
      fresh.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      for (const { row } of known) result.push(row);
      for (const row of fresh) result.push(row);
    }
    for (const row of visible) {
      if (!dirtySet.has(row.project_id)) result.push(row);
    }
    return result;
  }, [data, dirtyProjectIds, dirtySet]);

  // When grouping is active, re-sort projects (preserving task order within a
  // project) so that rows sharing group-by keys are consecutive. That lets us
  // use rowSpan for group icicles the same way project icicles work. Within a
  // group we preserve the upstream `orderedData` order so dirty-tray pinning
  // and SQL ordering both carry through — just partitioned by group.
  const groupedData = useMemo(() => {
    if (groupBy.length === 0) return orderedData;

    // First: group rows by project_id while preserving original order.
    const projectBlocks: { id: string; rows: TaskRow[] }[] = [];
    const blockIndex = new Map<string, number>();
    for (const row of orderedData) {
      let idx = blockIndex.get(row.project_id);
      if (idx === undefined) {
        idx = projectBlocks.length;
        blockIndex.set(row.project_id, idx);
        projectBlocks.push({ id: row.project_id, rows: [] });
      }
      projectBlocks[idx].rows.push(row);
    }

    // Per level, decide how two group keys should compare:
    //   - "tickle": compare the yyyy-mm-dd string chronologically, null first.
    //   - Picklist fields: follow the picklist's sort_order (option index from
    //     the options array, which the server already ordered by sort_order).
    //     Unknown/null options go last.
    const optionIndexByField: Record<string, Map<string, number>> = {
      uber_project: new Map(uberProjects.map((o, i) => [o.id, i])),
      project_status: new Map(projectStatuses.map((o, i) => [o.id, i])),
      action_order_status: new Map(
        actionOrderStatuses.map((o, i) => [o.id, i]),
      ),
    };

    const keyId = (k: GroupableKey, r: TaskRow) =>
      GROUP_ACCESSORS[k].id(r) ?? "__null__";

    const compareLevel = (
      k: GroupableKey,
      a: TaskRow,
      b: TaskRow,
    ): number => {
      const av = keyId(k, a);
      const bv = keyId(k, b);
      if (av === bv) return 0;
      if (k === "tickle") {
        // null dates sort first
        if (av === "__null__") return -1;
        if (bv === "__null__") return 1;
        return av < bv ? -1 : 1;
      }
      const m = optionIndexByField[k];
      const ai = m && av !== "__null__"
        ? m.get(av) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;
      const bi = m && bv !== "__null__"
        ? m.get(bv) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    };

    const sorted = [...projectBlocks].sort((a, b) => {
      for (const k of groupBy) {
        const c = compareLevel(k, a.rows[0], b.rows[0]);
        if (c !== 0) return c;
      }
      return 0;
    });
    return sorted.flatMap((b) => b.rows);
  }, [orderedData, groupBy, uberProjects, projectStatuses, actionOrderStatuses]);

  // Compute icicle spans for each active group-by level. Each span covers the
  // consecutive `groupedData` rows that share the same accumulated group path
  // up to that level, so rowSpan math for nested group cells stays coherent.
  const groupSpans = useMemo<GroupSpan[][]>(() => {
    if (groupBy.length === 0) return [];
    const levels: GroupSpan[][] = [];
    for (let level = 0; level < groupBy.length; level++) {
      const key = groupBy[level];
      const accessor = GROUP_ACCESSORS[key];
      const parents = groupBy.slice(0, level).map((k) => (r: TaskRow) => {
        const id = GROUP_ACCESSORS[k].id(r);
        return id ?? "__null__";
      });
      const spans = computeGroupSpans(
        groupedData,
        (r) => accessor.id(r) ?? "__null__",
        undefined,
        (r) => ({
          label: accessor.label(r),
          color: accessor.color(r) ?? null,
        }),
        parents.length > 0 ? parents : undefined,
      );
      levels.push(spans);
    }
    return levels;
  }, [groupedData, groupBy]);

  const projectSpans = useMemo(
    () =>
      computeGroupSpans(
        groupedData,
        projectAccessor,
        (r) => r.project_color,
        (r) => ({
          tickle: r.tickle_date,
          notes: r.project_notes,
          is_draft: r.project_is_draft,
          project_id: r.project_id,
        }),
        groupBy.map((k) => (r: TaskRow) => GROUP_ACCESSORS[k].id(r) ?? "__null__"),
      ),
    [groupedData, groupBy]
  );

  const projectStartSet = new Set(projectSpans.map((s) => s.startIndex));
  const projectEndSet = new Set(
    projectSpans.map((s) => s.startIndex + s.rowSpan - 1)
  );
  const projectEndToSpan = Object.fromEntries(
    projectSpans.map((s) => [s.startIndex + s.rowSpan - 1, s])
  );
  const projectByIndex = Object.fromEntries(projectSpans.map((s) => [s.startIndex, s]));

  // Index group spans by level + startIndex for quick lookup during render.
  const groupStartMaps: Map<number, GroupSpan>[] = groupSpans.map((spans) => {
    const m = new Map<number, GroupSpan>();
    for (const s of spans) m.set(s.startIndex, s);
    return m;
  });

  const TASK_COL_COUNT = 4; // task, task_status, result, notes

  const handleProjectsKeyDown = (e: React.KeyboardEvent<HTMLTableElement>) => {
    const target = e.target as HTMLElement;
    const tr = target.closest("tr[data-project-id]") as HTMLElement | null;
    const projectId = tr?.dataset.projectId;
    const taskId = tr?.dataset.taskId;

    // Cmd/Ctrl+Enter → commit the project of the focused row.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && projectId) {
      e.preventDefault();
      if (dirtySet.has(projectId)) commitProject(projectId);
      return;
    }

    // Alt+Up / Alt+Down → reorder task within project.
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && taskId) {
      e.preventDefault();
      void moveTask(taskId, e.key === "ArrowUp" ? "up" : "down");
      return;
    }

    handleGridKeyDown(e);
  };

  const orderedTaskKeys = useMemo(
    () =>
      resolveColumnOrder(
        params.columnOrder,
        TASK_COMMON_KEYS as readonly string[],
      ),
    [params.columnOrder],
  );

  const groupColumnKeys = groupBy.map((k) => `__group:${k}`);
  const columnKeys = [...groupColumnKeys, ...PROJECT_ICICLE_KEYS, ...orderedTaskKeys];

  const groupWidth = (level: number) => {
    const key = groupColumnKeys[level];
    return params.columnWidths[key] ?? ICICLE_GROUP_WIDTH;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedTaskKeys.indexOf(String(active.id));
    const newIndex = orderedTaskKeys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setColumnOrder(arrayMove(orderedTaskKeys, oldIndex, newIndex));
  };

  const headerClass =
    "text-left text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";

  const body = (
    <>
      <ViewSwitcher
        views={views}
        activeViewId={activeViewId}
        onSwitch={switchView}
        onCreate={createView}
        onRename={renameView}
        onDelete={deleteView}
      >
        Active projects &middot; click any field to edit &middot; drag column edges to resize
        {dirtyProjectIds.length > 0 && (
          <>
            {" "}&middot;{" "}
            <span>
              {dirtyProjectIds.length} uncommitted
            </span>
            {" "}
            <button
              type="button"
              onClick={commitAll}
              className="themed-button-sm"
              title="Commit every uncommitted project into its sorted position"
              style={{ marginLeft: 4 }}
            >
              Commit all
            </button>
          </>
        )}
      </ViewSwitcher>

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
          onKeyDown={handleProjectsKeyDown}
          style={{
            tableLayout: "fixed",
            width: columnKeys.reduce((sum, k) => {
              if (k.startsWith("__group:")) return sum + (params.columnWidths[k] ?? ICICLE_GROUP_WIDTH);
              return sum + (params.columnWidths[k] ?? 0);
            }, 0),
            borderCollapse: "separate",
            borderSpacing: "var(--row-gap)",
          }}
        >
          <colgroup>
            {columnKeys.map((key) => (
              <col
                key={key}
                style={{
                  width: key.startsWith("__group:")
                    ? params.columnWidths[key] ?? ICICLE_GROUP_WIDTH
                    : params.columnWidths[key],
                }}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {groupBy.map((k, level) => (
                <th
                  key={`gh-${k}`}
                  className={headerClass}
                  style={{ position: "relative" }}
                >
                  {HEADER_LABELS[k] ?? k}
                  <ColumnResizer
                    columnIndex={level}
                    currentWidth={groupWidth(level)}
                    onResize={(w) => setColumnWidth(`__group:${k}`, w)}
                  />
                </th>
              ))}
              {PROJECT_ICICLE_KEYS.map((key, i) =>
                key === "grip" ? (
                  <th
                    key={key}
                    className={headerClass}
                    style={{ width: 22 }}
                    aria-hidden
                  />
                ) : (
                  <th
                    key={key}
                    className={headerClass}
                    style={{ position: "relative" }}
                  >
                    {HEADER_LABELS[key]}
                    <ColumnResizer
                      columnIndex={i + groupBy.length}
                      currentWidth={params.columnWidths[key]}
                      onResize={(w) => setColumnWidth(key, w)}
                    />
                  </th>
                ),
              )}
              <SortableContext
                items={orderedTaskKeys}
                strategy={horizontalListSortingStrategy}
              >
                {orderedTaskKeys.map((key, i) => (
                  <SortableHeaderCell
                    key={key}
                    id={key}
                    className={headerClass}
                    style={{ position: "relative" }}
                    extras={
                      <ColumnResizer
                        columnIndex={i + groupBy.length + PROJECT_ICICLE_KEYS.length}
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
                colSpan={columnKeys.length}
                style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }}
              />
            </tr>
            <NewProjectRow colSpan={columnKeys.length} />
            <tr aria-hidden="true">
              <td
                colSpan={columnKeys.length}
                style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }}
              />
            </tr>
            {groupedData.map((row, i) => {
              const prev = i > 0 ? groupedData[i - 1] : null;
              const tickleChanged =
                prev !== null && prev.tickle_date !== row.tickle_date;
              return (
            <Fragment key={row.id}>
              {tickleChanged && (
                <tr aria-hidden="true">
                  <td
                    colSpan={columnKeys.length}
                    style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }}
                  />
                </tr>
              )}
              <ContextMenu>
                <ContextMenuTrigger render={<tr data-project-id={row.project_id} data-task-id={row.id} />}>
                {/* Group icicles (one per active group-by level). rowSpan
                   counts EVERY <tr> inside the span: task rows, the per-project
                   `+ Add task` rows, and tickle-change gap rows that fall
                   inside the group. Missing any of those lets a trailing row
                   snake back into column 0 and render "other stuff" under the
                   group header. */}
                {groupBy.map((k, level) => {
                  const start = groupStartMaps[level]?.get(i);
                  if (!start) return null;
                  const spanStart = start.startIndex;
                  const spanEnd = start.startIndex + start.rowSpan - 1;
                  let trCount = start.rowSpan;
                  for (let j = spanStart; j <= spanEnd; j++) {
                    if (projectEndSet.has(j)) trCount++;
                  }
                  for (let j = spanStart + 1; j <= spanEnd; j++) {
                    if (
                      groupedData[j].tickle_date !==
                      groupedData[j - 1].tickle_date
                    ) {
                      trCount++;
                    }
                  }
                  const color = (start.extra?.color as string | null) ?? null;
                  const label = (start.extra?.label as string) ?? start.value;
                  return (
                    <td
                      key={`group-${level}-${start.startIndex}`}
                      rowSpan={trCount}
                      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm"
                    >
                      {k === "tickle" ? (
                        <span
                          className={PILL_CLASS}
                          style={{
                            borderRadius: "var(--pill-radius)",
                            padding:
                              "var(--pill-padding-y) var(--pill-padding-x)",
                            fontSize: "var(--pill-font-size)",
                            fontWeight:
                              "var(--pill-font-weight)" as React.CSSProperties["fontWeight"],
                            backgroundColor: "#fff",
                            color: "var(--foreground)",
                            border: "1px solid var(--foreground)",
                            width: "fit-content",
                          }}
                        >
                          {label}
                        </span>
                      ) : (
                        <Pill color={color}>{label}</Pill>
                      )}
                    </td>
                  );
                })}
                {/* Icicle: Grip (rowspan-merged drag handle column, +1) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  const isDraft = Boolean(span.extra?.is_draft);
                  const myTickle = row.tickle_date ?? null;
                  const handleDragStart = (e: React.DragEvent) => {
                    dragState.current = {
                      projectId: row.project_id,
                      tickleDate: myTickle,
                    };
                    e.dataTransfer.effectAllowed = "move";
                    // Required for Firefox to start the drag.
                    try {
                      e.dataTransfer.setData("text/plain", row.project_id);
                    } catch {}
                  };
                  const handleDragOver = (e: React.DragEvent) => {
                    const src = dragState.current;
                    if (!src) return;
                    if ((src.tickleDate ?? null) !== myTickle) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  };
                  const handleDrop = (e: React.DragEvent) => {
                    e.preventDefault();
                    const src = dragState.current;
                    dragState.current = null;
                    if (!src || src.projectId === row.project_id) return;
                    if ((src.tickleDate ?? null) !== myTickle) return;
                    const seen = new Set<string>();
                    const ids: string[] = [];
                    for (const r of orderedData) {
                      if (r.project_is_draft) continue;
                      if ((r.tickle_date ?? null) !== myTickle) continue;
                      if (!seen.has(r.project_id)) {
                        seen.add(r.project_id);
                        ids.push(r.project_id);
                      }
                    }
                    const from = ids.indexOf(src.projectId);
                    const to = ids.indexOf(row.project_id);
                    if (from < 0 || to < 0) return;
                    ids.splice(from, 1);
                    ids.splice(to, 0, src.projectId);
                    void reorderProjectsInTickleDate(ids);
                  };
                  return (
                    <td
                      rowSpan={span.rowSpan + 1}
                      className="align-top px-0 py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-center"
                      onDragOver={isDraft ? undefined : handleDragOver}
                      onDrop={isDraft ? undefined : handleDrop}
                    >
                      {!isDraft && (
                        <span
                          draggable
                          onDragStart={handleDragStart}
                          className="cursor-grab select-none inline-block text-[color:var(--muted-foreground)] hover:text-foreground"
                          style={{ touchAction: "none", padding: "0 2px" }}
                          title="Drag to reorder within this tickle date"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                  );
                })()}

                {/* Icicle: Project (rowspan-merged, +1 to span add-row) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  const isDraft = Boolean(span.extra?.is_draft);
                  const isDirty = dirtySet.has(row.project_id);
                  const isAutoOrder = row.project_sort_order == null;
                  return (
                    <td
                      rowSpan={span.rowSpan + 1}
                      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="flex-1 min-w-0"
                          style={
                            isAutoOrder
                              ? {
                                  fontStyle: "italic",
                                  color: "var(--muted-foreground)",
                                }
                              : undefined
                          }
                          title={
                            isAutoOrder
                              ? "Auto-ordered alphabetically. Drag the grip to set a manual order."
                              : undefined
                          }
                        >
                          <EditableTextWrap
                            value={span.value}
                            onSave={(v) =>
                              updateProjectField(row.project_id, "name", v)
                            }
                          />
                        </div>
                        {(isDraft || isDirty) && (
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => commitProject(row.project_id)}
                              title={
                                isDraft
                                  ? "Commit: promote this draft into the corpus and leave the tray"
                                  : "Commit this project into its sorted position"
                              }
                              className="themed-button-sm themed-button-primary"
                            >
                              Commit
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })()}

                {/* Icicle: Tickle (project-level, rowspan-merged, +1) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  return (
                    <td
                      rowSpan={span.rowSpan + 1}
                      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm"
                    >
                      <EditableDate
                        value={(span.extra?.tickle as string) ?? ""}
                        onSave={(v) =>
                          updateProjectField(
                            row.project_id,
                            "tickle_date",
                            v,
                          )
                        }
                      />
                    </td>
                  );
                })()}

                {/* Icicle: Uber Project (rowspan-merged pill select, +1) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  return (
                    <td
                      rowSpan={span.rowSpan + 1}
                      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] text-sm bg-[color:var(--cell-bg)]"
                    >
                      <PillSelect
                        value={row.uber_project_id}
                        options={uberProjects}
                        onSave={(v) =>
                          updateProjectField(
                            row.project_id,
                            "uber_project_id",
                            v,
                          )
                        }
                        onCreate={createUberProjectOption}
                      />
                    </td>
                  );
                })()}

                {/* Icicle: Project Status (rowspan-merged pill select, +1) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  return (
                    <td
                      rowSpan={span.rowSpan + 1}
                      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm"
                    >
                      <PillSelect
                        value={row.project_status_id}
                        options={projectStatuses}
                        onSave={(v) =>
                          changeProjectStatus(row.project_id, v)
                        }
                        onCreate={createProjectStatusOption}
                      />
                    </td>
                  );
                })()}

                {/* Icicle: Action Order Status (rowspan-merged pill select, +1) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  return (
                    <td
                      rowSpan={span.rowSpan + 1}
                      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm"
                    >
                      <PillSelect
                        value={row.action_order_status_id ?? ""}
                        options={actionOrderStatuses}
                        onSave={(v) =>
                          updateProjectField(
                            row.project_id,
                            "action_order_status_id",
                            v || null,
                          )
                        }
                        onCreate={createActionOrderStatusOption}
                      />
                    </td>
                  );
                })()}

                {/* Task-level columns (user-reorderable via orderedTaskKeys). */}
                {orderedTaskKeys.map((key) => {
                  const taskCellClass =
                    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";
                  const isDone = row.task_status === "Done";
                  if (key === "task") {
                    return (
                      <td
                        key="task"
                        className={taskCellClass}
                        style={
                          isDone
                            ? {
                                textDecoration: "line-through",
                                color:
                                  "color-mix(in srgb, var(--foreground) 50%, transparent)",
                              }
                            : undefined
                        }
                      >
                        <EditableTextWrap
                          value={row.task}
                          onSave={(v) => updateTaskField(row.id, "name", v)}
                        />
                      </td>
                    );
                  }
                  if (key === "task_status") {
                    return (
                      <td key="task_status" className={`${taskCellClass} text-sm`}>
                        <PillSelect
                          value={row.task_status_id}
                          options={taskStatuses}
                          onSave={(v) =>
                            updateTaskField(row.id, "status_id", v)
                          }
                          onCreate={createTaskStatusOption}
                        />
                      </td>
                    );
                  }
                  if (key === "result") {
                    return (
                      <td key="result" className={taskCellClass}>
                        <EditableText
                          value={row.result ?? ""}
                          onSave={(v) =>
                            updateTaskField(row.id, "result", v || null)
                          }
                        />
                      </td>
                    );
                  }
                  if (key === "notes") {
                    return (
                      <td key="notes" className={taskCellClass}>
                        <EditableText
                          value={row.task_notes ?? ""}
                          onSave={(v) =>
                            updateTaskField(row.id, "notes", v || null)
                          }
                        />
                      </td>
                    );
                  }
                  return null;
                })}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() =>
                      setDeleteConfirm({
                        kind: "task",
                        id: row.id,
                        name: row.task,
                      })
                    }
                    variant="destructive"
                  >
                    Delete task
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() =>
                      setDeleteConfirm({
                        kind: "project",
                        id: row.project_id,
                        name:
                          (projectByIndex[i]?.value as string) ?? "this project",
                      })
                    }
                    variant="destructive"
                  >
                    Delete project
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              {projectEndSet.has(i) && (
                <AddTaskRow
                  projectId={projectEndToSpan[i].extra?.project_id as string ?? row.project_id}
                  colSpan={TASK_COL_COUNT}
                />
              )}
            </Fragment>
              );
            })}
          </tbody>
        </table>
        </DndContext>
      </div>
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-sm rounded-none p-4 gap-3 text-balance">
          <DialogHeader className="pr-8">
            <DialogTitle className="leading-relaxed">
              Delete {deleteConfirm?.kind === "project" ? "project" : "task"}{" "}
              {deleteConfirm?.name ? `"${deleteConfirm.name}"` : ""}?
            </DialogTitle>
            {deleteConfirm?.kind === "project" && (
              <DialogDescription>
                This will also delete all tasks under this project.
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deletePending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletePending}
              onClick={() => {
                if (!deleteConfirm) return;
                const target = deleteConfirm;
                startDeleteTransition(async () => {
                  if (target.kind === "task") {
                    await deleteTask(target.id);
                  } else {
                    await deleteProject(target.id);
                  }
                  setDeleteConfirm(null);
                });
              }}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (!wrapped) return body;
  return (
    <PageShell title={title} count={groupedData.length} maxWidth="">
      <Subtitle>
        Active and drafted projects with their task breakdown. Drafts surface first, then projects ordered by tickle date.
      </Subtitle>
      {body}
    </PageShell>
  );
}

function AddTaskRow({
  projectId,
  colSpan,
}: {
  projectId: string;
  colSpan: number;
}) {
  const [pending, startTransition] = useTransition();
  const activate = () => {
    if (!pending) startTransition(() => createTask(projectId));
  };
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        tabIndex={0}
        role="button"
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
          }
        }}
        title="Add a blank task to this project"
      >
        {pending ? "Adding…" : "+ Add task"}
      </td>
    </tr>
  );
}

function NewProjectRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  const activate = () => {
    if (!pending) startTransition(() => createProject());
  };
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        tabIndex={0}
        role="button"
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
          }
        }}
        title="Create a new draft project"
      >
        {pending ? "Creating…" : "+ New project"}
      </td>
    </tr>
  );
}

function EditableTextWrap({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void | Promise<void>;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setV(value), [value]);
  useLayoutEffect(() => {
    const ta = ref.current;
    if (ta) {
      ta.style.height = "0px";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [v]);
  return (
    <textarea
      ref={ref}
      value={v}
      placeholder={placeholder}
      rows={1}
      onChange={(e) => setV(e.target.value)}
      onContextMenu={(e) => e.preventDefault()}
      onBlur={() => {
        if (v !== value) {
          startTransition(() => {
            onSave(v);
          });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.currentTarget as HTMLTextAreaElement).blur();
        }
        if (e.key === "Escape") {
          setV(value);
          (e.currentTarget as HTMLTextAreaElement).blur();
        }
      }}
      style={{
        background: "transparent",
        color: "inherit",
        border: 0,
        padding: 0,
        font: "inherit",
        width: "100%",
        outline: "none",
        resize: "none",
        opacity: isPending ? 0.6 : 1,
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        lineHeight: "1.4",
        display: "block",
        textDecoration: "inherit",
        textWrap: "balance",
      }}
    />
  );
}

function EditableText({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void | Promise<void>;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  const [isPending, startTransition] = useTransition();
  useEffect(() => setV(value), [value]);
  return (
    <input
      type="text"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onContextMenu={(e) => e.preventDefault()}
      onBlur={() => {
        if (v !== value) {
          startTransition(() => {
            onSave(v);
          });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setV(value);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      style={{
        background: "transparent",
        color: "inherit",
        border: 0,
        padding: 0,
        font: "inherit",
        width: "100%",
        outline: "none",
        opacity: isPending ? 0.6 : 1,
      }}
    />
  );
}

function EditableDate({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string | null) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dateValue = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined;
  const displayLabel = dateValue ? format(dateValue, "EEE, MMM d") : null;

  // Base UI's default is to focus the first tabbable element in the popup —
  // which happens to be the "Previous Month" nav button. That left real
  // arrow/Enter presses landing on the nav chevron, so Enter either flipped
  // the month or (via focus redirection) toggled the already-selected day
  // off. Tell Base UI to hand initial focus to the selected/today day
  // button directly; react-day-picker's own DayButton effect then handles
  // arrow nav + Enter natively.
  const initialFocus = () => {
    const popup = document.querySelector<HTMLElement>(
      '[data-slot="popover-content"]',
    );
    if (!popup) return null;
    return (
      popup.querySelector<HTMLElement>('[data-selected="true"] button') ??
      popup.querySelector<HTMLElement>('[data-today="true"] button') ??
      popup.querySelector<HTMLElement>("[role='gridcell'] button") ??
      null
    );
  };

  // Laptop-friendly month/year nav. Remaps to the PageUp/PageDown keys
  // react-day-picker uses natively.
  //   Alt+←     → prev month  (PageUp)
  //   Alt+→     → next month  (PageDown)
  //   Alt+Shift+← → prev year (Shift+PageUp)
  //   Alt+Shift+→ → next year (Shift+PageDown)
  const altArrowMonthNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const popup = e.currentTarget;
    const day =
      popup.querySelector<HTMLElement>('[data-selected="true"] button') ??
      popup.querySelector<HTMLElement>('[data-today="true"] button') ??
      popup.querySelector<HTMLElement>("[role='gridcell'] button");
    if (!day) return;
    e.preventDefault();
    day.focus();
    day.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: e.key === "ArrowLeft" ? "PageUp" : "PageDown",
        shiftKey: e.shiftKey,
        bubbles: true,
        cancelable: true,
      }),
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            style={{
              background: "transparent",
              color: "inherit",
              border: 0,
              padding: 0,
              font: "inherit",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
            onKeyDown={(e) => {
              // Space on a focused button normally opens the popover (Base UI
              // default), but Enter sometimes races with outer handlers —
              // open explicitly so keyboard users get a consistent experience.
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
              }
            }}
          />
        }
      >
        {displayLabel ?? <span style={{ opacity: 0.4 }}>—</span>}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        initialFocus={initialFocus}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            return;
          }
          altArrowMonthNav(e);
        }}
      >
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(d) => {
            const newValue = d ? format(d, "yyyy-MM-dd") : null;
            startTransition(() => {
              onSave(newValue);
            });
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function EditableSelect({
  value,
  options,
  onSave,
}: {
  value: string;
  options: StatusOption[];
  onSave: (v: string) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      value={value}
      onChange={(e) => {
        startTransition(() => {
          onSave(e.target.value);
        });
      }}
      style={{
        background: "transparent",
        color: "inherit",
        border: 0,
        padding: 0,
        font: "inherit",
        width: "auto",
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {options.map((o) => (
        <option
          key={o.id}
          value={o.id}
          style={{ color: "#000", background: "#fff" }}
        >
          {o.name}
        </option>
      ))}
    </select>
  );
}
