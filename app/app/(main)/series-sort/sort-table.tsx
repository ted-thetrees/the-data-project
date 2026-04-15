"use client";

import { useMemo, useTransition } from "react";
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
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import { Subtitle } from "@/components/subtitle";
import { EditableText } from "@/components/editable-text";
import { useTableViews, resolveColumnOrder } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import type { SortRow } from "./page";
import { updateCrimeSeriesTitle, createCrimeSeries } from "../series/actions";

const PRE_EVAL_STATUS_ID = "e5dc627e-c7e7-474e-b097-c23850c1906c";

const SORT_COLUMN_KEYS = ["title", "network", "trailer", "release_date"] as const;

const SORT_DEFAULT_WIDTHS: Record<string, number> = {
  title: 220,
  network: 130,
  trailer: 480,
  release_date: 110,
};

const HEADER_LABELS: Record<string, string> = {
  title: "Series Title",
  network: "Network",
  trailer: "Trailer",
  release_date: "Release Date",
};

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

export function SortTable({ data }: { data: SortRow[] }) {
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
  } = useTableViews("series-sort", SORT_DEFAULT_WIDTHS);

  const orderedKeys = useMemo(
    () =>
      resolveColumnOrder(
        params.columnOrder,
        SORT_COLUMN_KEYS as readonly string[],
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

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] align-top";

  const cellRenderers: Record<string, (row: SortRow) => React.ReactNode> = {
    title: (row) => (
      <td key="title" className={`${cellClass} font-medium`}>
        <EditableText
          value={row.title}
          onSave={(v) => updateCrimeSeriesTitle(row.id, v)}
        />
      </td>
    ),
    network: (row) => (
      <td key="network" className={cellClass}>
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
            <WebLink url={row.youtube_trailer} />
          )}
        </td>
      );
    },
    release_date: (row) => (
      <td key="release_date" className={cellClass}>
        {row.release_date || <Empty />}
      </td>
    ),
  };

  return (
    <PageShell title="Series | Sort" count={data.length} maxWidth="">
      <Subtitle>
        Series pending evaluation &middot; sorted by trailer availability then title
      </Subtitle>
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
            style={{
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: "var(--row-gap)",
              width: orderedKeys.reduce(
                (sum, k) => sum + (params.columnWidths[k] ?? 0),
                0,
              ),
            }}
          >
            <colgroup>
              {orderedKeys.map((key) => (
                <col key={key} style={{ width: params.columnWidths[key] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
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
                          columnIndex={i}
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
                  colSpan={orderedKeys.length}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              <NewSortSeriesRow colSpan={orderedKeys.length} />
              <tr aria-hidden="true">
                <td
                  colSpan={orderedKeys.length}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              {data.map((row) => (
                <tr key={row.id}>
                  {orderedKeys.map((key) => cellRenderers[key]?.(row))}
                </tr>
              ))}
              <AddSortSeriesRow colSpan={orderedKeys.length} />
            </tbody>
          </table>
        </DndContext>
      </div>
    </PageShell>
  );
}

function NewSortSeriesRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending)
            startTransition(() => createCrimeSeries(PRE_EVAL_STATUS_ID));
        }}
        title="Create a new series in the evaluation queue"
      >
        {pending ? "Creating…" : "+ New series"}
      </td>
    </tr>
  );
}

function AddSortSeriesRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending)
            startTransition(() => createCrimeSeries(PRE_EVAL_STATUS_ID));
        }}
        title="Add another series to the evaluation queue"
      >
        {pending ? "Adding…" : "+ Add series"}
      </td>
    </tr>
  );
}
