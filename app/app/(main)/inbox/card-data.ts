import { detectContentType, extractYouTubeId, cleanUrl, type ContentType } from "@/lib/content";
import { fetchOgMeta } from "@/lib/og";
import { format as timeago } from "timeago.js";

export type CardData = {
  id: string;
  content: string;
  type: ContentType;
  date: string;
  passphrase: string | null;
  previewImage: string | null;
  ogImage: string | null;
  ogTitle: string | null;
  youtubeId: string | null;
};

async function getYouTubeThumbnail(ytId: string): Promise<string> {
  const maxres = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
  try {
    const res = await fetch(maxres, { method: "HEAD" });
    if (res.ok) return maxres;
  } catch {}
  return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
}

export async function resolveInboxCard(
  row: Record<string, unknown>,
): Promise<CardData> {
  const rawContent = (row.content as string) || "";
  const content = cleanUrl(rawContent);
  const type = detectContentType(content);
  const youtubeId = extractYouTubeId(content);
  const previewImage = (row.preview_image_url as string | null) ?? null;

  let ogImage: string | null = null;
  let ogTitle: string | null = null;
  if (type !== "text") {
    const meta = await fetchOgMeta(youtubeId ? content : content.split("?")[0]);
    ogTitle = meta.title;
    ogImage =
      meta.image ??
      (youtubeId ? await getYouTubeThumbnail(youtubeId) : null) ??
      previewImage;
  }

  return {
    id: row.id as string,
    content,
    type,
    date: row.created_date ? timeago(row.created_date as string) : "just now",
    passphrase: (row.passphrase as string | null) ?? null,
    previewImage,
    ogImage,
    ogTitle,
    youtubeId,
  };
}

export async function resolveInboxCards(
  rows: Record<string, unknown>[],
): Promise<CardData[]> {
  return Promise.all(rows.map(resolveInboxCard));
}
