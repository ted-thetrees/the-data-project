import {
  getMindMapData,
  createMindMapNode,
  updateMindMapNodeName,
  updateMindMapNodeDocument,
  toggleMindMapNodeCompleted,
  deleteMindMapNode,
  connectMindMapNodes,
  disconnectMindMapNodes,
} from "@/app/lib/mindmap";

export async function GET() {
  return Response.json(await getMindMapData());
}

export async function POST(request: Request) {
  const { name } = await request.json();
  const node = await createMindMapNode(name?.trim() || "New Node");
  return Response.json(node);
}

export async function PUT(request: Request) {
  const { parentPassphrase, childPassphrase } = await request.json();
  if (!parentPassphrase || !childPassphrase) {
    return Response.json({ error: "parentPassphrase and childPassphrase required" }, { status: 400 });
  }
  await connectMindMapNodes(parentPassphrase, childPassphrase);
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  const { passphrase, name, document, toggleCompleted } = await request.json();
  if (!passphrase) {
    return Response.json({ error: "passphrase required" }, { status: 400 });
  }
  if (toggleCompleted) {
    await toggleMindMapNodeCompleted(passphrase);
  } else if (document !== undefined) {
    await updateMindMapNodeDocument(passphrase, document);
  } else if (name) {
    await updateMindMapNodeName(passphrase, name.trim());
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { passphrase, parentPassphrase, childPassphrase } = await request.json();
  if (passphrase) {
    await deleteMindMapNode(passphrase);
  } else if (parentPassphrase && childPassphrase) {
    await disconnectMindMapNodes(parentPassphrase, childPassphrase);
  } else {
    return Response.json({ error: "passphrase or parentPassphrase+childPassphrase required" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
