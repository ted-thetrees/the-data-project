import { detectContentType, extractYouTubeId, cleanUrl } from "@/lib/content";
import { fetchOgImage } from "@/lib/og";
import { DeleteLink } from "./delete-button";
import { MigrateLink } from "./migrate-button";
import { ExternalLink } from "./external-link";
import { format as timeago } from "timeago.js";
import { LinkifiedText } from "./linkified-text";
import { MasonryGrid } from "./masonry-grid";

type Row = Record<string, unknown>;

const DUMMY_HREF = "#";
const stripe = "px-[23px] py-[19px]";
const metaBg = `${stripe} bg-[var(--contrast-light)]`;
const contentBg = `${stripe} bg-[var(--cell-bg)]`;
const metaText = "text-[13px] text-[color:var(--card-foreground)] leading-none";
const actionText =
  "text-[13px] text-[color:var(--primary)] leading-none hover:underline cursor-pointer";

async function getYouTubeThumbnail(ytId: string): Promise<string> {
  const maxres = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
  try {
    const res = await fetch(maxres, { method: "HEAD" });
    if (res.ok) return maxres;
  } catch {}
  return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
}

function ActionBar({ recordId }: { recordId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-y-[10px] gap-x-[18px]">
      <MigrateLink recordId={recordId} className={actionText} />
      <a href={DUMMY_HREF} className={actionText}>People</a>
      <a href={DUMMY_HREF} className={actionText}>YouTube</a>
      <a href={DUMMY_HREF} className={actionText}>Buy</a>
      <a href={DUMMY_HREF} className={actionText}>Series</a>
      <a href={DUMMY_HREF} className={actionText}>Do/Visit</a>
      <a href={DUMMY_HREF} className={actionText}>Talent</a>
      <a href={DUMMY_HREF} className={actionText}>Distractions (S)</a>
      <a href={DUMMY_HREF} className={actionText}>Distractions (R)</a>
    </div>
  );
}

async function UrlContent({ url }: { url: string }) {
  const ytId = extractYouTubeId(url);
  const ogImage = ytId
    ? await getYouTubeThumbnail(ytId)
    : await fetchOgImage(url.split("?")[0]);

  return (
    <div className="flex flex-col gap-[19px]">
      {ogImage && (
        <ExternalLink url={url} className="block">
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={ogImage}
              alt=""
              className="h-full w-full object-cover transition-opacity hover:opacity-95"
              loading="lazy"
            />
          </div>
        </ExternalLink>
      )}
      <ExternalLink url={url} className={`${actionText} break-all underline`}>
        {url}
      </ExternalLink>
    </div>
  );
}

async function InboxCard({ row }: { row: Row }) {
  const rawContent = (row.content as string) || "";
  const content = cleanUrl(rawContent);
  const type = detectContentType(content);
  const date = row.created_date ? timeago(row.created_date as string) : "just now";
  const passphrase = (row.passphrase as string | null) ?? null;
  const recordId = row.id as string;
  const isUrl = type !== "text";

  return (
    <div className="flex w-full flex-col gap-[2px]">
      <div className={metaBg}>
        <div className="flex items-center justify-between gap-3">
          <span className={metaText}>{date}</span>
          {passphrase ? (
            isUrl ? (
              <ExternalLink
                url={content}
                className={`${metaText} truncate italic`}
              >
                {passphrase}
              </ExternalLink>
            ) : (
              <span className={`${metaText} truncate italic`}>{passphrase}</span>
            )
          ) : (
            <span />
          )}
          <DeleteLink
            recordId={recordId}
            className={`${actionText} underline`}
          />
        </div>
      </div>

      <div className={contentBg}>
        {isUrl ? (
          <UrlContent url={content} />
        ) : (
          <p
            className={`${metaText} whitespace-pre-wrap break-words`}
            style={{ lineHeight: 1.5 }}
          >
            <LinkifiedText text={content} />
          </p>
        )}
      </div>

      <div className={metaBg}>
        <ActionBar recordId={recordId} />
      </div>
    </div>
  );
}

export async function InboxList({ records }: { records: Row[] }) {
  const items = records.map((row) => ({
    id: row.id as string,
    element: <InboxCard row={row} />,
  }));
  return <MasonryGrid items={items} />;
}
