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
} from "./actions";
import { Pill, PillSelect } from "@/components/pill";
import { useTableViews } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";

const COLUMN_KEYS = [
  "project",
  "tickle",
  "uber_project",
  "project_status",
  "task",
  "task_status",
  "result",
  "notes",
] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];

const COLUMN_HEADERS: { key: ColumnKey; label: string }[] = [
  { key: "project", label: "Project" },
  { key: "tickle", label: "Tickle" },
  { key: "uber_project", label: "Uber Project" },
  { key: "project_status", label: "Project Status" },
  { key: "task", label: "Task" },
  { key: "task_status", label: "Task Status" },
  { key: "result", label: "Result" },
  { key: "notes", label: "Notes" },
];

const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
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
  title = "Projects | Main",
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
  const projectByIndex = Object.fromEntries(projectSpans.map((s) => [s.startIndex, s]));

  const {
    views,
    activeViewId,
    params,
    switchView,
    createView,
    renameView,
    deleteView,
    setColumnWidth,
  } = useTableViews("projects-main", DEFAULT_COLUMN_WIDTHS);

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
        <table
          className="text-[length:var(--cell-font-size)] [&_td]:align-top"
          style={{
            tableLayout: "fixed",
            width: Object.values(params.columnWidths).reduce(
              (a, b) => a + b,
              0
            ),
            borderCollapse: "separate",
            borderSpacing: "var(--row-gap)",
          }}
        >
          <colgroup>
            {COLUMN_KEYS.map((key) => (
              <col key={key} style={{ width: params.columnWidths[key] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMN_HEADERS.map(({ key, label }, i) => (
                <th
                  key={key}
                  className="text-left text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]"
                  style={{ position: "relative" }}
                >
                  {label}
                  <ColumnResizer
                    columnIndex={i}
                    currentWidth={params.columnWidths[key]}
                    onResize={(w) => setColumnWidth(key, w)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr aria-hidden="true">
              <td
                colSpan={COLUMN_KEYS.length}
                style={{ height: 14, padding: 0, background: "transparent" }}
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
                    colSpan={COLUMN_KEYS.length}
                    style={{ height: 14, padding: 0, background: "transparent" }}
                  />
                </tr>
              )}
              <tr>
                {/* Icicle: Project (rowspan-merged) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  const isDraft = Boolean(span.extra?.is_draft);
                  return (
                    <td
                      rowSpan={span.rowSpan}
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
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <AddTaskButton projectId={row.project_id} />
                          {isDraft && (
                            <FinalizeButton projectId={row.project_id} />
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })()}

                {/* Icicle: Tickle (project-level, rowspan-merged) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  return (
                    <td
                      rowSpan={span.rowSpan}
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

                {/* Icicle: Uber Project (rowspan-merged pill select, project-level) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  return (
                    <td
                      rowSpan={span.rowSpan}
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
                      />
                    </td>
                  );
                })()}

                {/* Icicle: Project Status (rowspan-merged pill select) */}
                {projectStartSet.has(i) && (() => {
                  const span = projectByIndex[i];
                  return (
                    <td
                      rowSpan={span.rowSpan}
                      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm"
                    >
                      <PillSelect
                        value={row.project_status_id}
                        options={projectStatuses}
                        onSave={(v) =>
                          updateProjectField(row.project_id, "status_id", v)
                        }
                      />
                    </td>
                  );
                })()}

                {/* Task */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  <EditableTextWrap
                    value={row.task}
                    onSave={(v) => updateTaskField(row.id, "name", v)}
                  />
                </td>

                {/* Task Status (pill select) */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm">
                  <PillSelect
                    value={row.task_status_id}
                    options={taskStatuses}
                    onSave={(v) =>
                      updateTaskField(row.id, "status_id", v)
                    }
                  />
                </td>

                {/* Result */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  <EditableText
                    value={row.result ?? ""}
                    onSave={(v) =>
                      updateTaskField(row.id, "result", v || null)
                    }
                  />
                </td>

                {/* Notes */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  <EditableText
                    value={row.task_notes ?? ""}
                    onSave={(v) =>
                      updateTaskField(row.id, "notes", v || null)
                    }
                  />
                </td>
              </tr>
            </Fragment>
              );
            })}
          </tbody>
        </table>
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

function AddTaskButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => createTask(projectId))}
      disabled={pending}
      title="Add a blank task to this project"
      className="themed-button-sm shrink-0"
    >
      {pending ? "…" : "+ Task"}
    </button>
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
