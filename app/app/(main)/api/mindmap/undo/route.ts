import { restoreMindMapSnapshot, type MindMapData } from "@/app/lib/mindmap";

export async function POST(request: Request) {
  const snapshot: MindMapData = await request.json();
  await restoreMindMapSnapshot(snapshot);
  return Response.json({ ok: true });
}
