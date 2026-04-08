import {
  getDagData,
  updateDagTaskText,
  createDagTask,
  deleteDagTask,
  deleteDagEdge,
  createDagEdge,
} from "@/app/lib/neo4j";

export async function GET() {
  const data = await getDagData();
  return Response.json(data);
}

export async function POST(request: Request) {
  const { text, connectedFromId, handleType } = await request.json();
  if (!text) {
    return Response.json({ error: "text required" }, { status: 400 });
  }
  const node = await createDagTask(text.trim(), connectedFromId, handleType);
  return Response.json(node);
}

export async function PUT(request: Request) {
  const { sourceId, targetId } = await request.json();
  if (!sourceId || !targetId) {
    return Response.json({ error: "sourceId and targetId required" }, { status: 400 });
  }
  await createDagEdge(sourceId, targetId);
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  const { id, text } = await request.json();
  if (!id || !text) {
    return Response.json({ error: "id and text required" }, { status: 400 });
  }
  await updateDagTaskText(id, text.trim());
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { nodeId, edgeSource, edgeTarget } = await request.json();
  if (nodeId) {
    await deleteDagTask(nodeId);
  } else if (edgeSource && edgeTarget) {
    await deleteDagEdge(edgeSource, edgeTarget);
  } else {
    return Response.json({ error: "nodeId or edgeSource+edgeTarget required" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
