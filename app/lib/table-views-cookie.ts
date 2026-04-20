import { cookies } from "next/headers";

export const TABLE_VIEW_COOKIE_PREFIX = "tv-";

export interface StoredViewParams {
  columnWidths?: Record<string, number>;
  columnOrder?: string[];
}

export async function readAllTableViewCookies(): Promise<
  Record<string, StoredViewParams>
> {
  const store = await cookies();
  const out: Record<string, StoredViewParams> = {};
  for (const c of store.getAll()) {
    if (!c.name.startsWith(TABLE_VIEW_COOKIE_PREFIX)) continue;
    const key = c.name.slice(TABLE_VIEW_COOKIE_PREFIX.length);
    try {
      const parsed = JSON.parse(c.value);
      if (parsed && typeof parsed === "object") {
        out[key] = parsed as StoredViewParams;
      }
    } catch {
      // ignore malformed cookie
    }
  }
  return out;
}

/**
 * Read the persisted view params for a single storageKey and merge with
 * defaults. Returns a ready-to-use params object that callers can pass to
 * their client table as `initialParams`. Always safe to call: returns the
 * defaults when no cookie exists.
 */
export async function getInitialViewParams(
  storageKey: string,
  defaultWidths: Record<string, number>,
): Promise<{ columnWidths: Record<string, number>; columnOrder?: string[] }> {
  const store = await cookies();
  const raw = store.get(TABLE_VIEW_COOKIE_PREFIX + storageKey)?.value;
  if (!raw) return { columnWidths: { ...defaultWidths } };
  try {
    const parsed = JSON.parse(raw) as StoredViewParams;
    return {
      columnWidths: { ...defaultWidths, ...(parsed.columnWidths ?? {}) },
      columnOrder: parsed.columnOrder,
    };
  } catch {
    return { columnWidths: { ...defaultWidths } };
  }
}
