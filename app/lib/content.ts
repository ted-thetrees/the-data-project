export type ContentType = "youtube" | "x-post" | "bluesky" | "instagram" | "url" | "text";

export function detectContentType(content: string): ContentType {
  if (!content) return "text";
  const trimmed = content.trim();

  if (
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/.test(
      trimmed
    )
  ) {
    return "youtube";
  }

  if (/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\//.test(trimmed)) {
    return "x-post";
  }

  if (/^https?:\/\/(www\.)?bsky\.app\//.test(trimmed)) {
    return "bluesky";
  }

  if (/^https?:\/\/(www\.)?instagram\.com\//.test(trimmed)) {
    return "instagram";
  }

  if (/^https?:\/\//.test(trimmed)) {
    return "url";
  }

  return "text";
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function cleanUrl(url: string): string {
  try {
    const u = new URL(url.trim());

    // YouTube: keep only v= parameter
    if (/^(www\.)?youtube\.com$/.test(u.hostname) && u.searchParams.has("v")) {
      return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
    }

    // X/Twitter: strip query params (s=20, etc.)
    if (/^(www\.)?(twitter|x)\.com$/.test(u.hostname) && /\/status\/\d+/.test(u.pathname)) {
      return `${u.origin}${u.pathname}`;
    }

    return url.trim();
  } catch {
    return url.trim();
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function tidyText(text: string): string {
  return text
    .split(/\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      // Capitalize first letter
      const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      // Add period if doesn't end with punctuation
      if (/[.!?;:…]$/.test(capitalized)) return capitalized;
      return capitalized + ".";
    })
    .join("\n");
}
