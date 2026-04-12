"use client";

import { PageShell } from "@/components/page-shell";
import type { SortRow } from "./page";

function Empty() {
  return <span className="text-zinc-300">—</span>;
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

export function SortTable({ data }: { data: SortRow[] }) {
  return (
    <PageShell title="Series | Sort" count={data.length} maxWidth="">
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        Series pending evaluation &middot; sorted by trailer availability then title
      </p>
      <div className="overflow-x-auto">
        <table
          className="text-[length:var(--cell-font-size)]"
          style={{ tableLayout: "fixed", borderCollapse: "separate", borderSpacing: "var(--row-gap)" }}
        >
          <colgroup>
            <col style={{ width: 220 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 480 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              {["Series Title", "Network", "Trailer", "Release Date"].map((h) => (
                <th
                  key={h}
                  className="text-left text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const embedUrl = row.youtube_trailer ? youtubeEmbedUrl(row.youtube_trailer) : null;
              return (
                <tr key={row.id}>
                  <td className="px-[var(--cell-padding-x)] py-4 bg-[color:var(--cell-bg)] font-medium align-top">
                    <span className="text-base">{row.title}</span>
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
                    ) : row.youtube_trailer ? (
                      <a href={row.youtube_trailer} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline truncate block">
                        {row.youtube_trailer}
                      </a>
                    ) : (
                      <Empty />
                    )}
                  </td>
                  <td className="px-[var(--cell-padding-x)] py-4 bg-[color:var(--cell-bg)] text-sm align-top">
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
