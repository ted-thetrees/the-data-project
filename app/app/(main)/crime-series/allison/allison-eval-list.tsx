"use client";

import type { AllisonRow } from "./page";

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

export function AllisonEvalList({ data }: { data: AllisonRow[] }) {
  return (
    <div className="w-full mx-auto px-6 py-10" style={{ maxWidth: 800 }}>
      <h1 className="text-[length:var(--title-font-size)] font-[number:var(--title-font-weight)] tracking-[var(--letter-spacing-tight)] mb-2">
        Allison to Eval
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        {data.length} trailers to review
      </p>
      <div className="space-y-10">
        {data.map((row) => {
          const embedUrl = row.youtube_trailer ? youtubeEmbedUrl(row.youtube_trailer) : null;
          return (
            <div key={row.id}>
              <h2 className="text-base font-medium mb-3">{row.title}</h2>
              {embedUrl ? (
                <div className="relative w-full rounded-md overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    style={{ border: "none" }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <p className="text-sm text-zinc-400">No trailer available</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
