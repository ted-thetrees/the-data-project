import { getInboxRecords, getInboxCount } from "@/lib/db";
import { detectContentType, extractYouTubeId, extractDomain } from "@/lib/content";
import { fetchOgImage } from "@/lib/og";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "./delete-button";
import { ExternalLink } from "./external-link";

async function InboxCard({ row }: { row: Record<string, unknown> }) {
  const content = (row.content as string) || "";
  const type = detectContentType(content);
  const date = row.created_date
    ? new Date(row.created_date as string).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
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
        <DeleteButton recordId={row.id as string} />
      </div>

      {type !== "text" && <UrlCard url={content} />}
      {type === "text" && <TextCard text={content} />}
    </div>
  );
}

async function UrlCard({ url }: { url: string }) {
  const ogImage = await fetchOgImage(url.split("?")[0]);

  return (
    <ExternalLink
      url={url}
      className="group flex flex-col gap-2 text-left cursor-pointer"
    >
      {ogImage && (
        <div className="rounded-md overflow-hidden border">
          <img
            src={ogImage}
            alt=""
            className="w-full h-auto max-h-64 object-cover group-hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </div>
      )}
      <span className="text-sm text-primary group-hover:underline break-all">
        {url}
      </span>
    </ExternalLink>
  );
}

function TextCard({ text }: { text: string }) {
  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>;
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
