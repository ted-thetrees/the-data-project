import { extractYouTubeId } from "@/lib/content";

export type OgMeta = {
  image: string | null;
  title: string | null;
};

const ogCache = new Map<string, OgMeta>();

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function matchMeta(html: string, prop: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i"
  );
  const m = html.match(re1) ?? html.match(re2);
  return m ? decodeEntities(m[1]) : null;
}

async function fetchYouTubeOEmbed(url: string): Promise<OgMeta | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; thumbnail_url?: string };
    return {
      title: data.title ?? null,
      image: data.thumbnail_url ?? null,
    };
  } catch {
    return null;
  }
}

export async function fetchOgMeta(url: string): Promise<OgMeta> {
  if (ogCache.has(url)) return ogCache.get(url)!;

  if (extractYouTubeId(url)) {
    const yt = await fetchYouTubeOEmbed(url);
    if (yt && (yt.title || yt.image)) {
      ogCache.set(url, yt);
      return yt;
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "bot" },
    });
    clearTimeout(timeout);

    const html = await res.text();
    const image = matchMeta(html, "og:image") ?? matchMeta(html, "twitter:image");
    const ogTitle =
      matchMeta(html, "og:title") ?? matchMeta(html, "twitter:title");
    let title = ogTitle;
    if (!title) {
      const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = t ? decodeEntities(t[1].trim()) : null;
    }

    const meta: OgMeta = { image, title };
    ogCache.set(url, meta);
    return meta;
  } catch {
    const meta: OgMeta = { image: null, title: null };
    ogCache.set(url, meta);
    return meta;
  }
}

export async function fetchOgImage(url: string): Promise<string | null> {
  return (await fetchOgMeta(url)).image;
}
