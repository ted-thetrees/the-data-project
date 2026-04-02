export type ContentType = "youtube" | "x-post" | "url" | "text";

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
