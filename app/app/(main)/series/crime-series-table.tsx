"use client";

import { useMemo } from "react";
import { PageShell } from "@/components/page-shell";
import type { SeriesRow } from "./page";
import { Pill } from "@/components/pill";
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import { useTableViews } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";

const CRIME_COLUMN_KEYS = [
  "status",
  "title",
  "network",
  "trailer",
  "release_date",
] as const;

const CRIME_DEFAULT_WIDTHS: Record<string, number> = {
  status: 180,
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
}

function computeGroupSpans(
  data: SeriesRow[],
  accessor: (row: SeriesRow) => string,
  colorAccessor?: (row: SeriesRow) => string
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
      };
    } else {
      current.rowSpan++;
    }
  });
  if (current) spans.push(current);
  return spans;
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

export function CrimeSeriesTable({ data }: { data: SeriesRow[] }) {
  const statusSpans = useMemo(
    () =>
      computeGroupSpans(
        data,
        (r) => r.status || "(none)",
        (r) => r.status_color || ""
      ),
    [data]
  );

  const statusStartSet = new Set(statusSpans.map((s) => s.startIndex));
  const statusByIndex = Object.fromEntries(statusSpans.map((s) => [s.startIndex, s]));

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
    { key: "title", label: "Series Title" },
    { key: "network", label: "Network" },
    { key: "trailer", label: "Trailer" },
    { key: "release_date", label: "Release Date" },
  ];

  return (
    <PageShell title="Series" count={data.length} maxWidth="">
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        British crime &amp; murder TV &middot; grouped by status
      </p>
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
              <td colSpan={5} style={{ height: 14, padding: 0, background: "transparent" }} />
            </tr>
            {data.map((row, i) => {
              const embedUrl = row.youtube_trailer ? youtubeEmbedUrl(row.youtube_trailer) : null;
              return (
                <tr key={row.id}>
                  {statusStartSet.has(i) && (() => {
                    const span = statusByIndex[i];
                    return (
                      <td
                        rowSpan={span.rowSpan}
                        className="align-top px-3 py-3 bg-[color:var(--cell-bg)]"
                      >
                        <Pill color={span.color}>{span.value}</Pill>
                      </td>
                    );
                  })()}
                  <td className="px-[var(--cell-padding-x)] py-4 bg-[color:var(--cell-bg)] font-medium align-top">
                    {row.title}
                  </td>
                  <td className="px-[var(--cell-padding-x)] py-4 bg-[color:var(--cell-bg)] align-top">
                    {row.network || <Empty />}
                  </td>
                  <td className="px-[var(--cell-padding-x)] py-3 bg-[color:var(--cell-bg)]">
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
                  <td className="px-[var(--cell-padding-x)] py-4 bg-[color:var(--cell-bg)] align-top">
                    {row.release_date || <Empty />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
