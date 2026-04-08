"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  BaseEdge,
  getSmoothStepPath,
  addEdge,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type OnConnectEnd,
  type OnConnect,
  type OnDelete,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";

// ---- Types ---- //

interface DagNodeData {
  label: string;
  passphrase: string;
  color: string;
  autoEdit?: boolean;
  [key: string]: unknown;
}

interface ApiNode {
  id: string;
  text: string;
  passphrase: string;
}

interface ApiData {
  nodes: ApiNode[];
  edges: { source: string; target: string }[];
}

interface ContextMenu {
  x: number;
  y: number;
  type: "node" | "edge";
  nodeId?: string;
  edgeSource?: string;
  edgeTarget?: string;
}

// ---- Rainbow colors ---- //

function interpolateRainbow(t: number): string {
  const hue = t * 360;
  return `hsl(${hue}, 75%, 60%)`;
}

// ---- Elk Layout ---- //

const elk = new ELK();

const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  "elk.spacing.nodeNode": "80",
};

const NODE_W = 200;
const NODE_H = 60;

async function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const graph = {
    id: "root",
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      ...node,
      targetPosition: "top",
      sourcePosition: "bottom",
      width: NODE_W,
      height: NODE_H,
    })),
    edges: edges.map((e) => ({
      ...e,
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layoutedGraph = await elk.layout(graph);

  return {
    nodes: (layoutedGraph.children ?? []).map((node) => ({
      ...nodes.find((n) => n.id === node.id)!,
      position: { x: node.x!, y: node.y! },
    })),
    edges,
  };
}

// ---- Custom Node (Card) ---- //

function DagTaskNode({ data, id }: NodeProps) {
  const nodeData = data as DagNodeData;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(nodeData.label);
  }, [nodeData.label]);

  useEffect(() => {
    if (nodeData.autoEdit) {
      setEditing(true);
    }
  }, [nodeData.autoEdit]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function save() {
    setEditing(false);
    const trimmed = text.trim();
    if (!trimmed || trimmed === nodeData.label) {
      setText(nodeData.label);
      return;
    }
    await fetch("/api/dag", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, text: trimmed }),
    });
  }

  return (
    <BaseNode className="w-[200px]">
      <Handle type="target" position={Position.Top} />
      <BaseNodeHeader>
        {editing ? (
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setText(nodeData.label);
                setEditing(false);
              }
            }}
            className="flex-1 bg-transparent border-b border-muted-foreground text-sm font-semibold outline-none"
          />
        ) : (
          <BaseNodeHeaderTitle
            className="cursor-pointer text-sm"
            onDoubleClick={() => setEditing(true)}
          >
            {text}
          </BaseNodeHeaderTitle>
        )}
      </BaseNodeHeader>
      <div className="px-3 pb-2 text-[10px] text-muted-foreground">
        {nodeData.passphrase}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </BaseNode>
  );
}

// ---- Custom Edge (Gradient) ---- //

function GradientEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    source,
    target,
  } = props;

  const { getNode } = useReactFlow();
  const sourceNode = getNode(source);
  const targetNode = getNode(target);
  const sourceColor = (sourceNode?.data as DagNodeData)?.color ?? "#888";
  const targetColor = (targetNode?.data as DagNodeData)?.color ?? "#888";

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const gradientId = `grad-${id}`;

  return (
    <>
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor={sourceColor} />
          <stop offset="100%" stopColor={targetColor} />
        </linearGradient>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: `url(#${gradientId})`,
          strokeWidth: 3,
        }}
      />
      <polygon
        points="-6,-4 0,6 6,-4"
        fill={targetColor}
        transform={`translate(${targetX},${targetY - 2})`}
      />
    </>
  );
}

const nodeTypes = { dagTask: DagTaskNode };
const edgeTypes = { gradient: GradientEdge };

// ---- Context Menu Component ---- //

function NodeContextMenu({
  menu,
  onClose,
  onDelete,
  onRename,
}: {
  menu: ContextMenu;
  onClose: () => void;
  onDelete: () => void;
  onRename?: () => void;
}) {
  return (
    <div
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[120px]"
      style={{ left: menu.x, top: menu.y }}
    >
      {menu.type === "node" && onRename && (
        <button
          className="w-full px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700"
          onClick={() => { onRename(); onClose(); }}
        >
          Rename
        </button>
      )}
      <button
        className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-slate-700"
        onClick={() => { onDelete(); onClose(); }}
      >
        Delete
      </button>
    </div>
  );
}

// ---- Main Flow ---- //

function DagFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [loaded, setLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const { fitView, screenToFlowPosition, getViewport } = useReactFlow();
  const connectingRef = useRef<{ nodeId: string; handleType: string } | null>(null);

  // ---- Color assignment ---- //

  const assignColors = useCallback((layoutedNodes: Node[]) => {
    const sorted = [...layoutedNodes].sort((a, b) => a.position.y - b.position.y);
    const count = Math.max(sorted.length - 1, 1);
    const colorMap = new Map<string, string>();
    sorted.forEach((n, i) => {
      colorMap.set(n.id, interpolateRainbow(i / count));
    });
    return layoutedNodes.map((n) => ({
      ...n,
      data: { ...n.data, color: colorMap.get(n.id) },
    }));
  }, []);

  // ---- Layout ---- //

  const layoutAndSet = useCallback(
    async (apiNodes: Node[], apiEdges: Edge[]) => {
      if (apiNodes.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }
      const { nodes: layouted, edges: layoutedEdges } =
        await getLayoutedElements(apiNodes, apiEdges);
      const colored = assignColors(layouted);
      setNodes(colored);
      setEdges(layoutedEdges);
      window.requestAnimationFrame(() => fitView());
    },
    [setNodes, setEdges, fitView, assignColors]
  );

  // ---- Refresh (re-fetch + re-layout) ---- //

  const refresh = useCallback(
    async (autoEditId?: string) => {
      const r = await fetch("/api/dag");
      const data: ApiData = await r.json();
      const flowNodes: Node[] = data.nodes.map((n) => ({
        id: n.id,
        type: "dagTask",
        position: { x: 0, y: 0 },
        data: {
          label: n.text,
          passphrase: n.passphrase,
          color: "#888",
          autoEdit: n.id === autoEditId,
        },
      }));
      const flowEdges: Edge[] = data.edges.map((e, i) => ({
        id: `e-${i}`,
        source: e.target,
        target: e.source,
        type: "smoothstep",
        animated: true,
      }));
      await layoutAndSet(flowNodes, flowEdges);
    },
    [layoutAndSet]
  );

  // ---- Initial load ---- //

  useEffect(() => {
    refresh().then(() => setLoaded(true));
  }, [refresh]);

  // ---- Delete nodes & edges (Backspace) ---- //

  const onDelete: OnDelete = useCallback(
    async ({ nodes: deletedNodes, edges: deletedEdges }) => {
      const promises: Promise<unknown>[] = [];

      for (const node of deletedNodes) {
        promises.push(
          fetch("/api/dag", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nodeId: node.id }),
          })
        );
      }

      for (const edge of deletedEdges) {
        // React Flow edge source = Neo4j target (visual direction inverted)
        promises.push(
          fetch("/api/dag", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ edgeSource: edge.target, edgeTarget: edge.source }),
          })
        );
      }

      await Promise.all(promises);
      await refresh();
    },
    [refresh]
  );

  // ---- Connect existing nodes (handle to handle) ---- //

  const onConnect: OnConnect = useCallback(
    async (connection) => {
      if (!connection.source || !connection.target) return;

      // Persist: React Flow source = visual top, Neo4j: target DEPENDS_ON source
      await fetch("/api/dag", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: connection.target,
          targetId: connection.source,
        }),
      });

      await refresh();
    },
    [refresh]
  );

  // ---- Drag from handle to empty space → create node ---- //

  const onConnectStart = useCallback(
    (_: unknown, params: { nodeId: string | null; handleType: string | null }) => {
      if (params.nodeId && params.handleType) {
        connectingRef.current = {
          nodeId: params.nodeId,
          handleType: params.handleType,
        };
      }
    },
    []
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    async (event) => {
      if (!connectingRef.current) return;

      const { nodeId: fromId, handleType } = connectingRef.current;
      connectingRef.current = null;

      const target = event.target as HTMLElement;
      if (target.closest(".react-flow__node")) return;

      const res = await fetch("/api/dag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "New Task",
          connectedFromId: fromId,
          handleType,
        }),
      });
      const newNode = await res.json();
      await refresh(newNode.id); // auto-edit the new node
    },
    [refresh]
  );

  // ---- Double-click canvas → create orphan node ---- //

  const onPaneDoubleClick = useCallback(
    async (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".react-flow__node")) return;
      const res = await fetch("/api/dag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "New Task" }),
      });
      const newNode = await res.json();
      await refresh(newNode.id);
    },
    [refresh]
  );

  // ---- Right-click context menu ---- //

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "node",
        nodeId: node.id,
      });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "edge",
        edgeSource: edge.source,
        edgeTarget: edge.target,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleContextDelete = useCallback(async () => {
    if (!contextMenu) return;
    if (contextMenu.type === "node" && contextMenu.nodeId) {
      await fetch("/api/dag", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: contextMenu.nodeId }),
      });
    } else if (contextMenu.type === "edge" && contextMenu.edgeSource && contextMenu.edgeTarget) {
      // React Flow source = visual, Neo4j is inverted
      await fetch("/api/dag", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edgeSource: contextMenu.edgeTarget,
          edgeTarget: contextMenu.edgeSource,
        }),
      });
    }
    await refresh();
  }, [contextMenu, refresh]);

  const handleContextRename = useCallback(() => {
    if (contextMenu?.nodeId) {
      setEditingNodeId(contextMenu.nodeId);
      // Trigger edit mode by updating node data
      setNodes((nds) =>
        nds.map((n) =>
          n.id === contextMenu.nodeId
            ? { ...n, data: { ...n.data, autoEdit: true } }
            : n
        )
      );
    }
  }, [contextMenu, setNodes]);

  // ---- Keyboard shortcut: N to create node ---- //

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        const res = await fetch("/api/dag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "New Task" }),
        });
        const newNode = await res.json();
        await refresh(newNode.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [refresh]);

  if (!loaded) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-[family-name:var(--font-outfit)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen font-[family-name:var(--font-outfit)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onDelete={onDelete}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={closeContextMenu}
        onDoubleClick={onPaneDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        fitView
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "smoothstep", animated: true }}
      >
        <Background />
      </ReactFlow>

      {contextMenu && (
        <NodeContextMenu
          menu={contextMenu}
          onClose={closeContextMenu}
          onDelete={handleContextDelete}
          onRename={contextMenu.type === "node" ? handleContextRename : undefined}
        />
      )}
    </div>
  );
}

export default function DagPage() {
  return (
    <ReactFlowProvider>
      <DagFlow />
    </ReactFlowProvider>
  );
}
