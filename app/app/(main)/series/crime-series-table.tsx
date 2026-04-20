"use client";

import { Fragment, useMemo, useTransition } from "react";
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
import { PageShell } from "@/components/page-shell";
import type { SeriesRow } from "./page";
import { Pill, PillSelect, type PillOption } from "@/components/pill";
import { Empty } from "@/components/empty";
import { EditableLink } from "@/components/editable-link";
import { Subtitle } from "@/components/subtitle";
import { EditableText } from "@/components/editable-text";
import {
  useTableViews,
  resolveColumnOrder,
  type ViewParams,
} from "@/components/table-views";
import {
  CRIME_SERIES_STORAGE_KEY,
  CRIME_SERIES_DEFAULT_WIDTHS,
} from "./config";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { RowContextMenu } from "@/components/row-context-menu";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
import {
  updateCrimeSeriesStatus,
  updateCrimeSeriesTitle,
  updateCrimeSeriesTrailer,
  createCrimeSeries,
  deleteCrimeSeries,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";

const createCrimeSeriesStatusOption = (name: string) =>
  createPicklistOptionNamed("crime_series_statuses", name);

// "status" is the pinned icicle column; the rest are user-reorderable.
const CRIME_COMMON_KEYS = [
  "status_edit",
  "title",
  "network",
  "trailer",
  "release_date",
] as const;

const CRIME_DEFAULT_WIDTHS = CRIME_SERIES_DEFAULT_WIDTHS;

interface GroupSpan {
  value: string;
  rowSpan: number;
  startIndex: number;
  color?: string;
  statusId?: string | null;
}

function computeGroupSpans(
  data: SeriesRow[],
  accessor: (row: SeriesRow) => string,
  colorAccessor?: (row: SeriesRow) => string,
): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let current: GroupSpan | null = null;

  data.forEach((row, i) => {
    const val = accessor(row) || "(none)";
    if (!current || current.value !== val) {
      if (current) spans.push(current);
      current = {
        value: val,
        rowSpan: 1,
        startIndex: i,
        color: colorAccessor?.(row),
        statusId: row.status_id,
      };
    } else {
      current.rowSpan++;
    }
  });
  if (current) spans.push(current);
  return spans;
}

function AddSeriesRow({
  statusId,
  colSpan,
}: {
  statusId: string | null;
  colSpan: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createCrimeSeries(statusId));
        }}
        title="Add a new series in this status"
      >
        {pending ? "Adding…" : "+ Add series"}
      </td>
    </tr>
  );
}

function NewSeriesRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createCrimeSeries(null));
        }}
        title="Create a new series with no status"
      >
        {pending ? "Creating…" : "+ New series"}
      </td>
    </tr>
  );
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1);
    } else if (u.searchParams.has("v")) {
      videoId = u.searchParams.get("v");
    }
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export function CrimeSeriesTable({
  data,
  statusOptions,
  initialParams,
}: {
  data: SeriesRow[];
  statusOptions: PillOption[];
  initialParams?: ViewParams;
}) {
  const statusSpans = useMemo(
    () =>
      computeGroupSpans(
        data,
        (r) => r.status || "(none)",
        (r) => r.status_color || "",
      ),
    [data],
  );

  const statusStartSet = new Set(statusSpans.map((s) => s.startIndex));
  const statusByIndex = Object.fromEntries(
    statusSpans.map((s) => [s.startIndex, s]),
  );
  const statusEndToSpan = Object.fromEntries(
    statusSpans.map((s) => [s.startIndex + s.rowSpan - 1, s]),
  );
  const statusEndSet = new Set(
    statusSpans.map((s) => s.startIndex + s.rowSpan - 1),
  );

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
  } = useTableViews(CRIME_SERIES_STORAGE_KEY, CRIME_DEFAULT_WIDTHS, initialParams);

  const orderedCommonKeys = useMemo(
    () =>
      resolveColumnOrder(
        params.columnOrder,
        CRIME_COMMON_KEYS as readonly string[],
      ),
    [params.columnOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedCommonKeys.indexOf(String(active.id));
    const newIndex = orderedCommonKeys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setColumnOrder(arrayMove(orderedCommonKeys, oldIndex, newIndex));
  };

  const HEADER_LABELS: Record<string, string> = {
    status: "Status",
    status_edit: "Status (edit)",
    title: "Series Title",
    network: "Network",
    trailer: "Trailer",
    release_date: "Release Date",
  };

  const columnKeys = ["status", ...orderedCommonKeys];
  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";

  return (
    <PageShell title="Series" count={data.length} maxWidth="">
      <Subtitle>British crime &amp; murder TV &middot; grouped by status</Subtitle>
      <ViewSwitcher
        views={views}
        activeViewId={activeViewId}
        onSwitch={switchView}
        onCreate={createView}
        onRename={renameView}
        onDelete={deleteView}
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
            width: columnKeys.reduce(
              (sum, k) => sum + (params.columnWidths[k] ?? 0),
              0,
            ),
          }}
        >
          <colgroup>
            {columnKeys.map((key) => (
              <col key={key} style={{ width: params.columnWidths[key] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th key="status" className={headerClass}>
                Status
                <ColumnResizer
                  columnIndex={0}
                  currentWidth={params.columnWidths["status"]}
                  onResize={(w) => setColumnWidth("status", w)}
                />
              </th>
              <SortableContext
                items={orderedCommonKeys}
                strategy={horizontalListSortingStrategy}
              >
                {orderedCommonKeys.map((key, i) => (
                  <SortableHeaderCell
                    key={key}
                    id={key}
                    className={headerClass}
                    extras={
                      <ColumnResizer
                        columnIndex={i + 1}
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
            <NewSeriesRow colSpan={columnKeys.length} />
            <tr aria-hidden="true">
              <td
                colSpan={columnKeys.length}
                style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }}
              />
            </tr>
            {(() => {
              const crimeCellClass =
                "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] align-top";
              const commonCellRenderers: Record<
                string,
                (row: SeriesRow) => React.ReactNode
              > = {
                status_edit: (row) => (
                  <td key="status_edit" className={crimeCellClass}>
                    <PillSelect
                      value={row.status_id ?? ""}
                      options={statusOptions}
                      onSave={(statusId) =>
                        updateCrimeSeriesStatus(row.id, statusId)
                      }
                      onCreate={createCrimeSeriesStatusOption}
                    />
                  </td>
                ),
                title: (row) => (
                  <td
                    key="title"
                    className={`${crimeCellClass} font-medium`}
                  >
                    <EditableText
                      value={row.title}
                      onSave={(v) => updateCrimeSeriesTitle(row.id, v)}
                    />
                  </td>
                ),
                network: (row) => (
                  <td key="network" className={crimeCellClass}>
                    {row.network || <Empty />}
                  </td>
                ),
                trailer: (row) => {
                  const embedUrl = row.youtube_trailer
                    ? youtubeEmbedUrl(row.youtube_trailer)
                    : null;
                  return (
                    <td
                      key="trailer"
                      className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]"
                    >
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          width="440"
                          height="248"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="rounded-md"
                          style={{ border: "none" }}
                        />
                      ) : (
                        <EditableLink
                          value={row.youtube_trailer}
                          onSave={(v) => updateCrimeSeriesTrailer(row.id, v)}
                        />
                      )}
                    </td>
                  );
                },
                release_date: (row) => (
                  <td key="release_date" className={crimeCellClass}>
                    {row.release_date || <Empty />}
                  </td>
                ),
              };
              return data.map((row, i) => (
                <Fragment key={row.id}>
                  <RowContextMenu
                    onDelete={() => deleteCrimeSeries(row.id)}
                    itemLabel={row.title ? `"${row.title}"` : "this series"}
                  >
                    {statusStartSet.has(i) &&
                      (() => {
                        const span = statusByIndex[i];
                        return (
                          <td
                            rowSpan={span.rowSpan + 1}
                            className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]"
                          >
                            <Pill color={span.color}>{span.value}</Pill>
                          </td>
                        );
                      })()}
                    {orderedCommonKeys.map((key) =>
                      commonCellRenderers[key]?.(row),
                    )}
                  </RowContextMenu>
                  {statusEndSet.has(i) && (
                    <AddSeriesRow
                      statusId={statusEndToSpan[i].statusId ?? null}
                      colSpan={columnKeys.length - 1}
                    />
                  )}
                </Fragment>
              ));
            })()}
          </tbody>
        </table>
        </DndContext>
      </div>
    </PageShell>
  );
}
