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
import { PageShell } from "@/components/page-shell";
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
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";
import { Pill, PillSelect } from "@/components/pill";

const createUberProjectOption = (name: string) =>
  createPicklistOptionNamed("uber_projects", name);
const createProjectStatusOption = (name: string) =>
  createPicklistOptionNamed("project_statuses", name);
const createTaskStatusOption = (name: string) =>
  createPicklistOptionNamed("task_statuses", name);
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTableViews, resolveColumnOrder } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";

// Project-level icicle columns (rowspan-merged, pinned — not reorderable).
const PROJECT_ICICLE_KEYS = [
  "project",
  "tickle",
  "uber_project",
  "project_status",
] as const;

// Task-level columns (per-row, user-reorderable).
const TASK_COMMON_KEYS = ["task", "task_status", "result", "notes"] as const;

const HEADER_LABELS: Record<string, string> = {
  project: "Project",
  tickle: "Tickle",
  uber_project: "Uber Project",
  project_status: "Project Status",
  task: "Task",
  task_status: "Task Status",
  result: "Result",
  notes: "Notes",
};

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  uber_project: 140,
  project: 220,
  tickle: 110,
  project_status: 110,
  task: 280,
  task_status: 100,
  result: 220,
  notes: 220,
};

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
  uberProjects,
  wrapped = true,
  title = "Projects",
}: {
  data: TaskRow[];
  taskStatuses: StatusOption[];
  projectStatuses: StatusOption[];
  uberProjects: StatusOption[];
  wrapped?: boolean;
  title?: string;
}) {
  const projectAccessor = (r: TaskRow) => r.project;

  const projectSpans = useMemo(
    () =>
      computeGroupSpans(
        data,
        projectAccessor,
        (r) => r.project_color,
        (r) => ({
          tickle: r.tickle_date,
          notes: r.project_notes,
          is_draft: r.project_is_draft,
          project_id: r.project_id,
        })
      ),
    [data]
  );

  const projectStartSet = new Set(projectSpans.map((s) => s.startIndex));
  const projectEndSet = new Set(
    projectSpans.map((s) => s.startIndex + s.rowSpan - 1)
  );
  const projectEndToSpan = Object.fromEntries(
    projectSpans.map((s) => [s.startIndex + s.rowSpan - 1, s])
  );
  const projectByIndex = Object.fromEntries(projectSpans.map((s) => [s.startIndex, s]));

  const TASK_COL_COUNT = 4; // task, task_status, result, notes

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
  } = useTableViews("projects-main", DEFAULT_COLUMN_WIDTHS);

  const orderedTaskKeys = useMemo(
    () =>
      resolveColumnOrder(
        params.columnOrder,
        TASK_COMMON_KEYS as readonly string[],
      ),
    [params.columnOrder],
  );

  const columnKeys = [...PROJECT_ICICLE_KEYS, ...orderedTaskKeys];

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
      </ViewSwitcher>

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
            width: columnKeys.reduce(
              (sum, k) => sum + (params.columnWidths[k] ?? 0),
              0,
            ),
            borderCollapse: "separate",
            borderSpacing: "var(--row-gap)",
          }}
        >
          <colgroup>
            {columnKeys.map((key) => (
              <col key={key} style={{ width: params.columnWidths[key] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {PROJECT_ICICLE_KEYS.map((key, i) => (
                <th
                  key={key}
                  className={headerClass}
                  style={{ position: "relative" }}
                >
                  {HEADER_LABELS[key]}
                  <ColumnResizer
                    columnIndex={i}
                    currentWidth={params.columnWidths[key]}
                    onResize={(w) => setColumnWidth(key, w)}
                  />
                </th>
              ))}
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
                        columnIndex={i + PROJECT_ICICLE_KEYS.length}
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
            {data.map((row, i) => {
              const prev = i > 0 ? data[i - 1] : null;
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
                <ContextMenuTrigger render={<tr />}>
                {/* Icicle: Project (rowspan-merged, +1 to span add-row) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  const isDraft = Boolean(span.extra?.is_draft);
                  return (
                    <td
                      rowSpan={span.rowSpan + 1}
                      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <EditableTextWrap
                            value={span.value}
                            onSave={(v) =>
                              updateProjectField(row.project_id, "name", v)
                            }
                          />
                        </div>
                        {isDraft && (
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <FinalizeButton projectId={row.project_id} />
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
                            v
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
                            v
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
                          updateProjectField(row.project_id, "status_id", v)
                        }
                        onCreate={createProjectStatusOption}
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
                    onClick={() => {
                      void deleteTask(row.id);
                    }}
                    variant="destructive"
                  >
                    Delete task
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
    </>
  );

  if (!wrapped) return body;
  return (
    <PageShell title={title} count={data.length} maxWidth="">
      {body}
    </PageShell>
  );
}

function FinalizeButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => finalizeProject(projectId))}
      disabled={pending}
      title="Finalize draft — let this project sort into the corpus"
      className="themed-button-sm themed-button-success shrink-0"
    >
      {pending ? "…" : "Finalize"}
    </button>
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
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createTask(projectId));
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
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createProject());
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
          />
        }
      >
        {displayLabel ?? <span style={{ opacity: 0.4 }}>—</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
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
