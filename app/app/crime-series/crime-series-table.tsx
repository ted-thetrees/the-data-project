"use client";

import { PageShell } from "@/components/page-shell";
import type { SeriesRow } from "./page";

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

export function CrimeSeriesTable({ data }: { data: SeriesRow[] }) {
  return (
    <PageShell title="Crime Series" count={data.length} maxWidth="">
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        British crime &amp; murder TV &middot; sorted by release date
      </p>
      <div className="overflow-x-auto">
        <table
          className="w-full text-[length:var(--cell-font-size)]"
          style={{ tableLayout: "fixed", borderCollapse: "separate", borderSpacing: "var(--row-gap)" }}
        >
          <colgroup>
            <col style={{ width: 240 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 380 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              {["Series Title", "Network", "Trailer", "Status", "Release Date"].map((h) => (
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
                  <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] font-medium">
                    {row.title}
                  </td>
                  <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                    {row.network || <Empty />}
                  </td>
                  <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        width="340"
                        height="190"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded"
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
                  <td
                    className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] align-middle"
                    style={row.status_color ? { backgroundColor: row.status_color, color: "#ffffff" } : undefined}
                  >
                    <span className="text-sm leading-snug whitespace-nowrap">{row.status || <Empty />}</span>
                  </td>
                  <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)] text-sm">
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
