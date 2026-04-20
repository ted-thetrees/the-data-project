"use client";

import { DeleteLink } from "./delete-button";
import { MigrateLink } from "./migrate-button";
import { ExternalLink } from "./external-link";
import { LinkifiedText } from "./linkified-text";
import type { CardData } from "./card-data";

const DUMMY_HREF = "#";
const stripe = "px-[23px] py-[19px]";
const frameInset = "px-[6px] pb-[6px]";
const metaBgDefault = `${stripe} bg-[#f8f8f8cc]`;
const contentBg = `${stripe} bg-[#ffffffcc]`;
const metaTextDefault = "text-[13px] text-[color:var(--card-foreground)] leading-none";
const actionText =
  "text-[13px] text-black leading-none hover:underline cursor-pointer";

const whiteText = "text-[13px] text-white leading-none";
const SOURCE_META: Record<string, { frame: string; text: string }> = {
  youtube: { frame: "bg-[#DF0100]", text: whiteText },
  "x-post": { frame: "bg-black", text: whiteText },
  bluesky: { frame: "bg-[#0085FF]", text: whiteText },
  instagram: { frame: "bg-[#E34076]", text: whiteText },
  text: { frame: "bg-[#A1C730]", text: whiteText },
  url: { frame: "bg-[#A72DBC]", text: whiteText },
};

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

function UrlContent({ card }: { card: CardData }) {
  const ogImage = card.ogImage;
  const label = card.ogTitle?.trim() || card.content;
  return (
    <div className="flex flex-col gap-[19px]">
      {ogImage && (
        <ExternalLink url={card.content} className="-mx-[23px] -mt-[19px] block">
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
      <ExternalLink
        url={card.content}
        title={card.content}
        className={`${actionText} break-words`}
      >
        {label}
      </ExternalLink>
    </div>
  );
}

export function InboxCard({ card }: { card: CardData }) {
  const { id: recordId, content, type, date, passphrase } = card;
  const isUrl = type !== "text";
  const source = SOURCE_META[type];
  const frameBg = source?.frame ?? "bg-[var(--contrast-light)]";
  const metaText = source?.text ?? metaTextDefault;
  const deleteClass = source
    ? `${source.text} cursor-pointer hover:underline`
    : actionText;

  return (
    <div className={`flex w-full flex-col overflow-hidden rounded-[10px] ${frameBg} ${frameInset}`}>
      <div className="-mx-[6px] px-[29px] py-[19px]">
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
          <DeleteLink recordId={recordId} className={deleteClass} />
        </div>
      </div>

      <div className={contentBg}>
        {isUrl ? (
          <UrlContent card={card} />
        ) : (
          <div className="flex flex-col gap-[19px]">
            {card.previewImage && (
              <div className="-mx-[23px] -mt-[19px] aspect-video w-[calc(100%+46px)] overflow-hidden bg-[#A1C630]">
                <img
                  src={card.previewImage}
                  alt=""
                  className="h-full w-full object-cover mix-blend-luminosity"
                  loading="lazy"
                />
              </div>
            )}
            <p
              className={`${metaTextDefault} whitespace-pre-wrap break-words`}
              style={{ lineHeight: 1.5 }}
            >
              <LinkifiedText text={content} />
            </p>
          </div>
        )}
      </div>

      <div className={metaBgDefault}>
        <ActionBar recordId={recordId} />
      </div>
    </div>
  );
}
