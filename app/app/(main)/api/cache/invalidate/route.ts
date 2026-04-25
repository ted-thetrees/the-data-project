import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const KNOWN_TAGS = new Set([
  "projects-main",
  "talent",
  "inbox",
  "people",
  "series",
  "backlog",
  "get",
  "calories",
  "color-palettes",
  "user-stories",
  "table-features",
  "jtbd",
  "inf-images",
]);

function authorized(req: NextRequest): boolean {
  const expected = process.env.CACHE_INVALIDATE_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

function collectTags(req: NextRequest, body: unknown): string[] {
  const fromQuery = req.nextUrl.searchParams.getAll("tag");
  const fromBody: string[] = [];
  if (body && typeof body === "object") {
    const b = body as { tag?: unknown; tags?: unknown };
    if (typeof b.tag === "string") fromBody.push(b.tag);
    if (Array.isArray(b.tags)) {
      for (const t of b.tags) if (typeof t === "string") fromBody.push(t);
    }
  }
  return [...fromQuery, ...fromBody];
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const requested = collectTags(req, body);
  if (requested.length === 0) {
    return NextResponse.json({ error: "no tags supplied" }, { status: 400 });
  }

  const invalidated: string[] = [];
  const unknown: string[] = [];
  for (const tag of requested) {
    if (KNOWN_TAGS.has(tag)) {
      revalidateTag(tag, "max");
      invalidated.push(tag);
    } else {
      unknown.push(tag);
    }
  }

  return NextResponse.json({ ok: true, invalidated, unknown });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
