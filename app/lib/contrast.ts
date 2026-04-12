export function contrastTextColor(
  background: string | null | undefined
): "#000" | "#fff" {
  if (!background) return "#000";
  const m = /^#?([0-9a-f]{6})$/i.exec(background.trim());
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#000" : "#fff";
}
