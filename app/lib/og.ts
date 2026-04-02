const ogCache = new Map<string, string | null>();

export async function fetchOgImage(url: string): Promise<string | null> {
  if (ogCache.has(url)) return ogCache.get(url) ?? null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "bot" },
    });
    clearTimeout(timeout);

    const html = await res.text();
    const match = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      );

    const image = match ? match[1] : null;
    ogCache.set(url, image);
    return image;
  } catch {
    ogCache.set(url, null);
    return null;
  }
}
