"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { Value } from "platejs";
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { Plate, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/components/ui/editor";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type OnConnect,
  type OnConnectEnd,
  type OnDelete,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PT_Sans } from "next/font/google";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pt-sans",
});
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeContent,
} from "@/components/base-node";

// ---- Types ---- //

interface MindMapNodeData {
  name: string;
  passphrase: string;
  image?: string;
  completed: boolean;
  document?: string;
  isAlias: boolean;
  autoEdit?: boolean;
  [key: string]: unknown;
}

interface ApiData {
  nodes: { passphrase: string; name: string; image?: string; completed: boolean; document?: string }[];
  edges: { parent: string; child: string }[];
}

interface ContextMenu {
  x: number;
  y: number;
  type: "node" | "edge" | "pane";
  passphrase?: string;
  flowId?: string;
  isAlias?: boolean;
  aliasParentPassphrase?: string;
  parentPassphrase?: string;
  childPassphrase?: string;
}

// ---- Helpers ---- //

// Node IDs are passphrases directly
function toPassphrase(flowId: string) {
  return flowId;
}

// Okabe-Ito palette — maximally distinguishable, colorblind-safe
const EDGE_COLORS = [
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#009E73", // bluish green
  "#F0E442", // yellow
  "#0072B2", // blue
  "#D55E00", // vermilion
  "#CC79A7", // reddish purple
  "#000000", // black
];

function getEdgeColor(index: number) {
  return EDGE_COLORS[index % EDGE_COLORS.length];
}

// ---- Simple grid layout ---- //

const NODE_W = 180;
const NODE_H = 160;
const H_GAP = 60;
const V_GAP = 80;

function computeLayout(nodes: Node[], edges: Edge[]) {
  if (nodes.length === 0) return { nodes: [], edges };

  // Build adjacency: parent → children
  const childrenOf = new Map<string, string[]>();
  const parentCount = new Map<string, number>();
  for (const e of edges) {
    const children = childrenOf.get(e.source) ?? [];
    children.push(e.target);
    childrenOf.set(e.source, children);
    parentCount.set(e.target, (parentCount.get(e.target) ?? 0) + 1);
  }

  // Find roots (no parents)
  const roots = nodes.filter((n) => !parentCount.has(n.id)).map((n) => n.id);
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0].id);

  // BFS to assign layers
  const layer = new Map<string, number>();
  const queue = roots.map((id) => ({ id, depth: 0 }));
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (layer.has(id) && layer.get(id)! >= depth) continue;
    layer.set(id, depth);
    for (const child of childrenOf.get(id) ?? []) {
      queue.push({ id: child, depth: depth + 1 });
    }
  }
  // Assign unvisited nodes to layer 0
  for (const n of nodes) {
    if (!layer.has(n.id)) layer.set(n.id, 0);
  }

  // Group by layer
  const layers = new Map<number, string[]>();
  for (const [id, d] of layer) {
    const arr = layers.get(d) ?? [];
    arr.push(id);
    layers.set(d, arr);
  }

  // Position nodes
  const posMap = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of layers) {
    const totalWidth = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    const startX = -totalWidth / 2;
    ids.forEach((id, i) => {
      posMap.set(id, {
        x: startX + i * (NODE_W + H_GAP),
        y: d * (NODE_H + V_GAP),
      });
    });
  }

  return {
    nodes: nodes.map((n) => ({
      ...n,
      position: posMap.get(n.id) ?? { x: 0, y: 0 },
    })),
    edges,
  };
}

// ---- Direct graph mapping (one node per passphrase) ---- //

function toFlowElements(data: ApiData, autoEditPassphrase?: string) {
  const flowNodes: Node[] = data.nodes.map((n) => ({
    id: n.passphrase,
    type: "mindMapNode",
    position: { x: 0, y: 0 },
    data: {
      name: n.name,
      passphrase: n.passphrase,
      image: n.image,
      completed: n.completed,
      document: n.document,
      isAlias: false,
      autoEdit: n.passphrase === autoEditPassphrase,
    },
  }));

  const flowEdges: Edge[] = data.edges.map((e, i) => {
    const color = getEdgeColor(i);
    return {
      id: `e-${e.parent}-${e.child}-${i}`,
      source: e.parent,
      target: e.child,
      type: "bezier",
      style: { stroke: color, strokeWidth: 1.5 },
      markerEnd: {
        type: "arrowclosed" as const,
        color,
      },
    };
  });

  return { flowNodes, flowEdges };
}

// ---- Custom Node ---- //

function MindMapNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as MindMapNodeData;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(nodeData.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(nodeData.name); }, [nodeData.name]);
  useEffect(() => { if (nodeData.autoEdit) setEditing(true); }, [nodeData.autoEdit]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function save() {
    setEditing(false);
    const trimmed = text.trim();
    if (!trimmed || trimmed === nodeData.name) {
      setText(nodeData.name);
      return;
    }
    // Snapshot before rename
    const snap = await fetch("/api/mindmap").then((r) => r.json());
    window.dispatchEvent(new CustomEvent("mindmap-snapshot", { detail: snap }));

    await fetch("/api/mindmap", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase: nodeData.passphrase, name: trimmed }),
    });
    window.dispatchEvent(new CustomEvent("mindmap-refresh"));
  }

  return (
    <div
      className={`w-[180px] flex flex-col border ${nodeData.isAlias ? "opacity-70 border-dashed" : ""}`}
      style={{
        borderRadius: "0.3rem",
        backgroundColor: "#E3DDFD",
        borderColor: "#7B66DE",
        filter: nodeData.completed ? "saturate(0) brightness(1.15)" : "none",
      }}
      tabIndex={0}
    >
      <Handle type="target" position={Position.Top} style={{ backgroundColor: "#7B66DE", borderColor: "#7B66DE", top: -5 }} />

      {/* 16:9 image */}
      {nodeData.image ? (
        <div className="overflow-hidden relative group" style={{ borderRadius: "calc(0.3rem - 1px) calc(0.3rem - 1px) 0 0" }}>
          <img
            src={nodeData.image}
            alt=""
            className="w-full object-cover"
            style={{ aspectRatio: "16/9" }}
          />
          <label
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <span className="text-white text-xs font-semibold">Replace</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append("file", file);
                form.append("passphrase", nodeData.passphrase);
                await fetch("/api/mindmap/upload", { method: "POST", body: form });
                window.dispatchEvent(new CustomEvent("mindmap-refresh"));
              }}
            />
          </label>
        </div>
      ) : (
        <div
          className="w-full relative"
          style={{ aspectRatio: "16/9", backgroundColor: "#F1EEFE", borderRadius: "calc(0.3rem - 1px) calc(0.3rem - 1px) 0 0" }}
        >
          <label
            className="absolute bottom-0.5 right-0.5 cursor-pointer rounded px-1 py-0 text-[10px] font-bold leading-none"
            style={{ backgroundColor: "transparent", color: "#7B66DE" }}
          >
            +
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append("file", file);
                form.append("passphrase", nodeData.passphrase);
                await fetch("/api/mindmap/upload", { method: "POST", body: form });
                window.dispatchEvent(new CustomEvent("mindmap-refresh"));
              }}
            />
          </label>
        </div>
      )}

      <div style={{ borderTop: "1px solid #7B66DE" }} />

      {/* Text content */}
      <div className="px-3 pt-2 text-center">
        {editing ? (
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") { setText(nodeData.name); setEditing(false); }
            }}
            className="w-full bg-transparent text-sm font-semibold outline-none text-center"
            style={{ color: "#7B66DE", borderBottom: "1px solid #7B66DE" }}
          />
        ) : (
          <div
            className="text-sm font-semibold cursor-pointer leading-snug"
            style={{ color: "#7B66DE", textWrap: "balance", lineHeight: "1.15" }}
            onDoubleClick={() => setEditing(true)}
          >
            {text}
          </div>
        )}
      </div>
      <div className="px-3 pt-1.5 pb-2 relative">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[10px]" style={{ color: "#B0A5EC", letterSpacing: "normal" }}>
            {nodeData.passphrase}
          </span>
          {nodeData.isAlias && (
            <span className="text-[9px] px-1 rounded" style={{ backgroundColor: "#7B66DE", color: "#E3DDFD" }}>
              alias
            </span>
          )}
        </div>
        {/* Document icon - bottom left */}
        <button
          className="absolute bottom-1.5 left-2 cursor-pointer"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("mindmap-open-doc", {
              detail: { passphrase: nodeData.passphrase, name: nodeData.name, document: nodeData.document },
            }));
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={nodeData.document ? "#7B66DE" : "none"} stroke="#7B66DE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </button>
        {/* Checkbox - bottom right */}
        <input
          type="checkbox"
          checked={nodeData.completed}
          onChange={async () => {
            await fetch("/api/mindmap", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ passphrase: nodeData.passphrase, toggleCompleted: true }),
            });
            window.dispatchEvent(new CustomEvent("mindmap-refresh"));
          }}
          className="absolute bottom-2 right-2 w-3.5 h-3.5 cursor-pointer accent-[#7B66DE]"
        />
      </div>

      <Handle type="source" position={Position.Bottom} style={{ backgroundColor: "#7B66DE", borderColor: "#7B66DE", bottom: -5 }} />
    </div>
  );
}

// ---- Document Editor Modal ---- //

const DEFAULT_VALUE: Value = [{ type: "p", children: [{ text: "" }] }];

function DocumentModal({
  passphrase,
  name,
  initialDocument,
  onClose,
}: {
  passphrase: string;
  name: string;
  initialDocument?: string;
  onClose: () => void;
}) {
  const parsed = initialDocument ? JSON.parse(initialDocument) : DEFAULT_VALUE;

  const editor = usePlateEditor({
    plugins: [BoldPlugin, ItalicPlugin, UnderlinePlugin],
    value: parsed,
  });

  const saveAndClose = useCallback(async () => {
    const content = JSON.stringify(editor.children);
    await fetch("/api/mindmap", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase, document: content }),
    });
    window.dispatchEvent(new CustomEvent("mindmap-refresh"));
    onClose();
  }, [editor, passphrase, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ padding: 100 }}
      onClick={(e) => { if (e.target === e.currentTarget) saveAndClose(); }}
    >
      <div
        className="h-full rounded-lg border shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#7B66DE", maxWidth: 800, width: "100%" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "#E3DDFD" }}>
          <h2 className="text-lg font-semibold" style={{ color: "#7B66DE" }}>{name}</h2>
          <button
            onClick={saveAndClose}
            className="text-sm px-3 py-1 rounded"
            style={{ backgroundColor: "#7B66DE", color: "#FFFFFF" }}
          >
            Save & Close
          </button>
        </div>
        {/* Editor */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <Plate editor={editor}>
            <EditorContainer>
              <Editor placeholder="Start writing..." className="min-h-full" />
            </EditorContainer>
          </Plate>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { mindMapNode: MindMapNodeComponent };

// ---- Context Menu ---- //

function MindMapContextMenu({
  menu,
  onClose,
  onDelete,
  onAlias,
  onDeleteAlias,
  onRename,
  onAddChild,
  onNewNode,
}: {
  menu: ContextMenu;
  onClose: () => void;
  onDelete?: () => void;
  onAlias?: () => void;
  onDeleteAlias?: () => void;
  onRename?: () => void;
  onAddChild?: () => void;
  onNewNode?: () => void;
}) {
  const item = "w-full px-3 py-1.5 text-left text-sm hover:opacity-80";
  const danger = "w-full px-3 py-1.5 text-left text-sm text-red-500 hover:opacity-80";

  return (
    <div
      className="fixed z-50 rounded-lg shadow-xl py-1 min-w-[140px] border"
      style={{ left: menu.x, top: menu.y, backgroundColor: "#E3DDFD", borderColor: "#7B66DE", color: "#7B66DE" }}
    >
      {menu.type === "pane" && onNewNode && (
        <button className={item} onClick={() => { onNewNode(); onClose(); }}>
          New Node
        </button>
      )}
      {menu.type === "node" && onRename && (
        <button className={item} onClick={() => { onRename(); onClose(); }}>
          Rename
        </button>
      )}
      {menu.type === "node" && onAddChild && (
        <button className={item} onClick={() => { onAddChild(); onClose(); }}>
          Add Child
        </button>
      )}
      {menu.type === "node" && onAlias && (
        <button className={item} onClick={() => { onAlias(); onClose(); }}>
          Create Alias
        </button>
      )}
      {onDeleteAlias && (
        <button className={danger} onClick={() => { onDeleteAlias(); onClose(); }}>
          Delete Alias
        </button>
      )}
      {onDelete && (
        <button className={danger} onClick={() => { onDelete(); onClose(); }}>
          {menu.type === "edge" ? "Disconnect" : "Delete Node"}
        </button>
      )}
    </div>
  );
}

// ---- Main Flow ---- //

function MindMapFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [loaded, setLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [aliasSource, setAliasSource] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<{ passphrase: string; name: string; document?: string } | null>(null);
  const { fitView, screenToFlowPosition } = useReactFlow();
  const connectingRef = useRef<{ nodeId: string; handleType: string } | null>(null);
  const connectedRef = useRef(false);
  const undoStackRef = useRef<ApiData[]>([]);

  // ---- Layout ---- //

  const layoutAndSet = useCallback(
    async (flowNodes: Node[], flowEdges: Edge[]) => {
      if (flowNodes.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }
      const { nodes: layouted, edges: layoutedEdges } =
        computeLayout(flowNodes, flowEdges);
      setNodes(layouted);
      setEdges(layoutedEdges);
      window.requestAnimationFrame(() => fitView());
    },
    [setNodes, setEdges, fitView]
  );

  // ---- Undo ---- //

  const saveSnapshot = useCallback(async () => {
    const r = await fetch("/api/mindmap");
    const data: ApiData = await r.json();
    undoStackRef.current.push(data);
  }, []);

  const undo = useCallback(async () => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    await fetch("/api/mindmap/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    const { flowNodes, flowEdges } = toFlowElements(snapshot);
    await layoutAndSet(flowNodes, flowEdges);
  }, [layoutAndSet]);

  // ---- Refresh ---- //

  const refresh = useCallback(
    async (autoEditPassphrase?: string) => {
      const r = await fetch("/api/mindmap");
      const data: ApiData = await r.json();
      const { flowNodes, flowEdges } = toFlowElements(data, autoEditPassphrase);
      await layoutAndSet(flowNodes, flowEdges);
    },
    [layoutAndSet]
  );

  // Listen for refresh/snapshot/open-doc events from child components
  useEffect(() => {
    const refreshHandler = () => refresh();
    const snapshotHandler = (e: Event) => {
      const data = (e as CustomEvent).detail as ApiData;
      undoStackRef.current.push(data);
    };
    const openDocHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setOpenDoc(detail);
    };
    window.addEventListener("mindmap-refresh", refreshHandler);
    window.addEventListener("mindmap-snapshot", snapshotHandler);
    window.addEventListener("mindmap-open-doc", openDocHandler);
    return () => {
      window.removeEventListener("mindmap-refresh", refreshHandler);
      window.removeEventListener("mindmap-snapshot", snapshotHandler);
      window.removeEventListener("mindmap-open-doc", openDocHandler);
    };
  }, [refresh]);

  // ---- Initial load ---- //

  useEffect(() => {
    refresh().then(() => setLoaded(true));
  }, [refresh]);

  // ---- Connect existing nodes (handle to handle) ---- //

  const onConnect: OnConnect = useCallback(
    async (connection) => {
      if (!connection.source || !connection.target) return;
      connectedRef.current = true;
      const parentPassphrase = toPassphrase(connection.source);
      const childPassphrase = toPassphrase(connection.target);
      if (parentPassphrase === childPassphrase) return;

      await saveSnapshot();
      await fetch("/api/mindmap", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPassphrase, childPassphrase }),
      });
      await refresh();
    },
    [refresh]
  );

  // ---- Drag handle to empty space → create connected node ---- //

  const onConnectStart = useCallback(
    (_: unknown, params: { nodeId: string | null; handleType: string | null }) => {
      if (params.nodeId && params.handleType) {
        connectingRef.current = { nodeId: params.nodeId, handleType: params.handleType };
      }
    },
    []
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    async (event) => {
      if (!connectingRef.current) return;
      const { nodeId: fromFlowId, handleType } = connectingRef.current;
      connectingRef.current = null;

      // If onConnect already handled this (handle-to-handle), skip
      if (connectedRef.current) {
        connectedRef.current = false;
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest(".react-flow__node")) return;

      const fromPassphrase = toPassphrase(fromFlowId);

      await saveSnapshot();
      const res = await fetch("/api/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Node" }),
      });
      const newNode = await res.json();

      // Connect: source handle (bottom) = from is parent, target handle (top) = from is child
      const parent = handleType === "source" ? fromPassphrase : newNode.passphrase;
      const child = handleType === "source" ? newNode.passphrase : fromPassphrase;

      await fetch("/api/mindmap", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPassphrase: parent, childPassphrase: child }),
      });

      await refresh(newNode.passphrase);
    },
    [refresh]
  );

  // ---- Delete (Backspace) ---- //

  const onDelete: OnDelete = useCallback(
    async ({ nodes: deletedNodes, edges: deletedEdges }) => {
      await saveSnapshot();
      const promises: Promise<unknown>[] = [];

      for (const node of deletedNodes) {
        const passphrase = toPassphrase(node.id);
        promises.push(
          fetch("/api/mindmap", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ passphrase }),
          })
        );
      }

      for (const edge of deletedEdges) {
        const parentPassphrase = toPassphrase(edge.source);
        const childPassphrase = toPassphrase(edge.target);
        promises.push(
          fetch("/api/mindmap", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parentPassphrase, childPassphrase }),
          })
        );
      }

      await Promise.all(promises);
      await refresh();
    },
    [refresh]
  );

  // ---- Context menu ---- //

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const nodeData = node.data as MindMapNodeData;
      // Find the parent of this specific instance by looking at incoming edges
      let aliasParentPassphrase: string | undefined;
      if (nodeData.isAlias) {
        const incomingEdge = edges.find((e) => e.target === node.id);
        if (incomingEdge) {
          aliasParentPassphrase = toPassphrase(incomingEdge.source);
        }
      }
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "node",
        passphrase: toPassphrase(node.id),
        flowId: node.id,
        isAlias: nodeData.isAlias,
        aliasParentPassphrase,
      });
    },
    [edges]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "edge",
        parentPassphrase: toPassphrase(edge.source),
        childPassphrase: toPassphrase(edge.target),
      });
    },
    []
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "pane",
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleContextDelete = useCallback(async () => {
    if (!contextMenu) return;
    await saveSnapshot();
    if (contextMenu.type === "node" && contextMenu.passphrase) {
      await fetch("/api/mindmap", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: contextMenu.passphrase }),
      });
    } else if (contextMenu.type === "edge" && contextMenu.parentPassphrase && contextMenu.childPassphrase) {
      await fetch("/api/mindmap", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPassphrase: contextMenu.parentPassphrase,
          childPassphrase: contextMenu.childPassphrase,
        }),
      });
    }
    await refresh();
  }, [contextMenu, refresh]);

  // ---- Context menu actions ---- //

  const handleNewNode = useCallback(async () => {
    await saveSnapshot();
    const res = await fetch("/api/mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Node" }),
    });
    const newNode = await res.json();
    await refresh(newNode.passphrase);
  }, [refresh]);

  const handleRename = useCallback(() => {
    if (contextMenu?.passphrase) {
      // Set autoEdit on the node to trigger edit mode
      setNodes((nds) =>
        nds.map((n) =>
          toPassphrase(n.id) === contextMenu.passphrase
            ? { ...n, data: { ...n.data, autoEdit: true } }
            : n
        )
      );
    }
  }, [contextMenu, setNodes]);

  const handleAddChild = useCallback(async () => {
    if (!contextMenu?.passphrase) return;
    await saveSnapshot();
    const res = await fetch("/api/mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Node" }),
    });
    const newNode = await res.json();
    await fetch("/api/mindmap", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentPassphrase: contextMenu.passphrase,
        childPassphrase: newNode.passphrase,
      }),
    });
    await refresh(newNode.passphrase);
  }, [contextMenu, refresh]);

  const handleDeleteAlias = useCallback(async () => {
    if (!contextMenu?.passphrase || !contextMenu?.aliasParentPassphrase) return;
    await saveSnapshot();
    await fetch("/api/mindmap", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentPassphrase: contextMenu.aliasParentPassphrase,
        childPassphrase: contextMenu.passphrase,
      }),
    });
    await refresh();
  }, [contextMenu, saveSnapshot, refresh]);

  const handleStartAlias = useCallback(() => {
    if (contextMenu?.passphrase) {
      setAliasSource(contextMenu.passphrase);
    }
  }, [contextMenu]);

  const onNodeClick = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      if (!aliasSource) return;
      const targetPassphrase = toPassphrase(node.id);
      if (targetPassphrase === aliasSource) {
        setAliasSource(null);
        return;
      }
      await saveSnapshot();
      await fetch("/api/mindmap", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPassphrase: targetPassphrase,
          childPassphrase: aliasSource,
        }),
      });
      setAliasSource(null);
      await refresh();
    },
    [aliasSource, refresh]
  );

  const onPaneClick = useCallback(() => {
    closeContextMenu();
    setAliasSource(null);
  }, [closeContextMenu]);

  // ---- Keyboard shortcuts ---- //

  useHotkeys("mod+z", () => { undo(); }, { enableOnFormTags: false, preventDefault: true }, [undo]);

  useHotkeys("n", async () => {
    await saveSnapshot();
    const res = await fetch("/api/mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Node" }),
    });
    const newNode = await res.json();
    await refresh(newNode.passphrase);
  }, { enableOnFormTags: false, preventDefault: true }, [refresh, saveSnapshot]);

  if (!loaded) {
    return (
      <div className={`h-screen flex items-center justify-center ${ptSans.className}`} style={{ backgroundColor: "#FFFFFF", color: "#7B66DE" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen ${ptSans.className}`} style={{ backgroundColor: "#FFFFFF" }}>
      {aliasSource && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm shadow-lg" style={{ backgroundColor: "#7B66DE", color: "#E3DDFD" }}>
          Click a node to make it the parent of the alias. Click empty space to cancel.
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onDelete={onDelete}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        colorMode="light"
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "bezier", style: { stroke: "#7B66DE" } }}
      >
        <Background color="#E3DDFD" />
      </ReactFlow>

      {contextMenu && (
        <MindMapContextMenu
          menu={contextMenu}
          onClose={closeContextMenu}
          onDelete={contextMenu.type !== "pane" ? handleContextDelete : undefined}
          onAlias={contextMenu.type === "node" ? handleStartAlias : undefined}
          onDeleteAlias={contextMenu.type === "node" && contextMenu.isAlias ? handleDeleteAlias : undefined}
          onRename={contextMenu.type === "node" ? handleRename : undefined}
          onAddChild={contextMenu.type === "node" ? handleAddChild : undefined}
          onNewNode={contextMenu.type === "pane" ? handleNewNode : undefined}
        />
      )}

      {openDoc && (
        <DocumentModal
          passphrase={openDoc.passphrase}
          name={openDoc.name}
          initialDocument={openDoc.document}
          onClose={() => setOpenDoc(null)}
        />
      )}
    </div>
  );
}

export default function MindMapPage() {
  return (
    <ReactFlowProvider>
      <MindMapFlow />
    </ReactFlowProvider>
  );
}
