export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

import { getInboxRecords, getInboxCount } from "@/lib/db";
import { detectContentType, extractYouTubeId, extractDomain, cleanUrl } from "@/lib/content";
import { fetchOgImage } from "@/lib/og";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "./delete-button";
import { ExternalLink } from "./external-link";
import { format as timeago } from "timeago.js";
import { LinkifiedText } from "./linkified-text";

async function InboxCard({ row }: { row: Record<string, unknown> }) {
  const rawContent = (row.content as string) || "";
  const content = cleanUrl(rawContent);
  const type = detectContentType(content);
  const date = row.created_date
    ? timeago(row.created_date as string)
    : null;

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {type !== "text" && (
            <Badge variant="secondary" className="text-xs">
              {type === "youtube" ? "YouTube" : type === "x-post" ? "X" : extractDomain(content)}
            </Badge>
          )}
          {date && <span className="text-xs text-muted-foreground">{date}</span>}
        </div>
        <div className="flex items-center gap-2">
          {row.passphrase != null && (
            <span className="text-xs font-mono rounded-full px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300">
              {row.passphrase as string}
            </span>
          )}
          <DeleteButton recordId={row.id as string} />
        </div>
      </div>

      {type !== "text" && <UrlCard url={content} />}
      {type === "text" && <TextCard text={content} />}
    </div>
  );
}

async function getYouTubeThumbnail(ytId: string): Promise<string> {
  const maxres = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
  try {
    const res = await fetch(maxres, { method: "HEAD" });
    if (res.ok) return maxres;
  } catch {}
  return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
}

async function UrlCard({ url }: { url: string }) {
  const ytId = extractYouTubeId(url);
  const ogImage = ytId
    ? await getYouTubeThumbnail(ytId)
    : await fetchOgImage(url.split("?")[0]);

  return (
    <ExternalLink
      url={url}
      className="group flex flex-col gap-2 text-left cursor-pointer"
    >
      {ogImage && (
        <div className="relative rounded-md overflow-hidden border aspect-video">
          <img
            src={ogImage}
            alt=""
            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
            loading="lazy"
          />
          {ytId && (
            <div className="absolute bottom-2 right-2 bg-black/70 rounded-md p-3">
              <svg viewBox="0 0 121.48 85.04" className="w-16 h-auto">
                <path d="M118.9 13.3c-1.4-5.2-5.5-9.3-10.7-10.7C98.7 0 60.7 0 60.7 0s-38 0-47.5 2.5C8.1 3.9 3.9 8.1 2.5 13.3 0 22.8 0 42.5 0 42.5s0 19.8 2.5 29.2C3.9 76.9 8 81 13.2 82.4 22.8 85 60.7 85 60.7 85s38 0 47.5-2.5c5.2-1.4 9.3-5.5 10.7-10.7 2.5-9.5 2.5-29.2 2.5-29.2s.1-19.8-2.5-29.3z" fill="red"/>
                <path fill="#fff" d="M48.6 24.3v36.4l31.6-18.2z"/>
              </svg>
            </div>
          )}
        </div>
      )}
      <span className="text-sm text-primary underline break-all">
        {url}
      </span>
    </ExternalLink>
  );
}

function TextCard({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap text-balance">
      <LinkifiedText text={text} />
    </p>
  );
}

export default async function Home() {
  const [records, count] = await Promise.all([
    getInboxRecords(50),
    getInboxCount(),
  ]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <span className="text-sm text-muted-foreground">
            {count.toLocaleString()} records
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {records.map((row) => (
            <InboxCard key={row.id} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}
