"use client";

import { PageShell } from "@/components/page-shell";
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import { useTableViews } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import type { SortRow } from "./page";

const SORT_COLUMN_KEYS = ["title", "network", "trailer", "release_date"] as const;

const SORT_DEFAULT_WIDTHS: Record<string, number> = {
  title: 220,
  network: 130,
  trailer: 480,
  release_date: 110,
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
  } = useTableViews("series-sort", SORT_DEFAULT_WIDTHS);

  const headers: { key: string; label: string }[] = [
    { key: "title", label: "Series Title" },
    { key: "network", label: "Network" },
    { key: "trailer", label: "Trailer" },
    { key: "release_date", label: "Release Date" },
  ];

  return (
    <PageShell title="Series | Sort" count={data.length} maxWidth="">
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        Series pending evaluation &middot; sorted by trailer availability then title
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
          style={{ tableLayout: "fixed", borderCollapse: "separate", borderSpacing: "var(--row-gap)" }}
        >
          <colgroup>
            {SORT_COLUMN_KEYS.map((key) => (
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
              <td colSpan={4} style={{ height: 14, padding: 0, background: "transparent" }} />
            </tr>
            {data.map((row) => {
              const embedUrl = row.youtube_trailer ? youtubeEmbedUrl(row.youtube_trailer) : null;
              return (
                <tr key={row.id}>
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
