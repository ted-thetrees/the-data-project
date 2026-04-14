"use client";

import { Fragment, useMemo, useTransition } from "react";
import { PageShell } from "@/components/page-shell";
import type { SeriesRow } from "./page";
import { Pill, PillSelect, type PillOption } from "@/components/pill";
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import { Subtitle } from "@/components/subtitle";
import { EditableText } from "@/components/editable-text";
import { useTableViews } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import {
  updateCrimeSeriesStatus,
  updateCrimeSeriesTitle,
  createCrimeSeries,
} from "./actions";

const CRIME_COLUMN_KEYS = [
  "status",
  "status_edit",
  "title",
  "network",
  "trailer",
  "release_date",
] as const;

const CRIME_DEFAULT_WIDTHS: Record<string, number> = {
  status: 180,
  status_edit: 180,
  title: 220,
  network: 130,
  trailer: 480,
  release_date: 110,
};

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
}: {
  data: SeriesRow[];
  statusOptions: PillOption[];
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
  } = useTableViews("crime-series", CRIME_DEFAULT_WIDTHS);

  const headers: { key: string; label: string }[] = [
    { key: "status", label: "Status" },
    { key: "status_edit", label: "Status (edit)" },
    { key: "title", label: "Series Title" },
    { key: "network", label: "Network" },
    { key: "trailer", label: "Trailer" },
    { key: "release_date", label: "Release Date" },
  ];

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
        <table
          className="text-[length:var(--cell-font-size)] [&_td]:align-top"
          style={{
            tableLayout: "fixed",
            borderCollapse: "separate",
            borderSpacing: "var(--row-gap)",
            width: Object.values(params.columnWidths).reduce((a, b) => a + b, 0),
          }}
        >
          <colgroup>
            {CRIME_COLUMN_KEYS.map((key) => (
              <col key={key} style={{ width: params.columnWidths[key] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h.key}
                  className="relative text-left text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]"
                >
                  {h.label}
                  <ColumnResizer
                    columnIndex={i}
                    currentWidth={params.columnWidths[h.key]}
                    onResize={(w) => setColumnWidth(h.key, w)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr aria-hidden="true">
              <td
                colSpan={CRIME_COLUMN_KEYS.length}
                style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }}
              />
            </tr>
            <NewSeriesRow colSpan={CRIME_COLUMN_KEYS.length} />
            <tr aria-hidden="true">
              <td
                colSpan={CRIME_COLUMN_KEYS.length}
                style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }}
              />
            </tr>
            {data.map((row, i) => {
              const embedUrl = row.youtube_trailer
                ? youtubeEmbedUrl(row.youtube_trailer)
                : null;
              return (
                <Fragment key={row.id}>
                  <tr>
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
                    <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] align-top">
                      <PillSelect
                        value={row.status_id ?? ""}
                        options={statusOptions}
                        onSave={(statusId) =>
                          updateCrimeSeriesStatus(row.id, statusId)
                        }
                      />
                    </td>
                    <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] font-medium align-top">
                      <EditableText
                        value={row.title}
                        onSave={(v) => updateCrimeSeriesTitle(row.id, v)}
                      />
                    </td>
                    <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] align-top">
                      {row.network || <Empty />}
                    </td>
                    <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
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
                    <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] align-top">
                      {row.release_date || <Empty />}
                    </td>
                  </tr>
                  {statusEndSet.has(i) && (
                    <AddSeriesRow
                      statusId={statusEndToSpan[i].statusId ?? null}
                      colSpan={CRIME_COLUMN_KEYS.length - 1}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
