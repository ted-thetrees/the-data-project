"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import {
  Inbox as InboxIcon,
  List,
  Target,
  Plus,
  Users,
  User,
  BookOpen,
  Film,
  Palette,
  Apple,
  Command,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Leaf = { kind: "leaf"; label: string; path: string; key: string; icon: LucideIcon };
type Branch = { kind: "branch"; label: string; icon: LucideIcon; children: Leaf[] };
type Root = { kind: "root"; children: Branch[] };
type NavNode = Root | Branch | Leaf;

const NAV: Branch[] = [
  { kind: "branch", label: "Inbox", icon: InboxIcon, children: [
    { kind: "leaf", label: "Chrono", path: "/inbox", key: "i", icon: InboxIcon },
    { kind: "leaf", label: "Pick Lists", path: "/pick-lists", key: "I", icon: List },
  ] },
  { kind: "branch", label: "Projects", icon: Target, children: [
    { kind: "leaf", label: "Progress", path: "/projects-main", key: "p", icon: Target },
    { kind: "leaf", label: "New", path: "/new-project", key: "n", icon: Plus },
    { kind: "leaf", label: "Pick Lists", path: "/pick-lists/projects", key: "P", icon: List },
  ] },
  { kind: "branch", label: "Talent", icon: Users, children: [
    { kind: "leaf", label: "Area", path: "/talent", key: "t", icon: Users },
    { kind: "leaf", label: "Pick Lists", path: "/pick-lists/talent", key: "T", icon: List },
  ] },
  { kind: "branch", label: "People", icon: User, children: [
    { kind: "leaf", label: "Chrono", path: "/people", key: "o", icon: User },
    { kind: "leaf", label: "Pick Lists", path: "/pick-lists/people", key: "O", icon: List },
  ] },
  { kind: "branch", label: "User Stories", icon: BookOpen, children: [
    { kind: "leaf", label: "Chrono", path: "/user-stories", key: "u", icon: BookOpen },
    { kind: "leaf", label: "Pick Lists", path: "/pick-lists/user-stories", key: "U", icon: List },
  ] },
  { kind: "branch", label: "Series", icon: Film, children: [
    { kind: "leaf", label: "Status", path: "/series", key: "s", icon: Film },
    { kind: "leaf", label: "Pick Lists", path: "/pick-lists/crime-series", key: "S", icon: List },
  ] },
  { kind: "branch", label: "Color Palettes", icon: Palette, children: [
    { kind: "leaf", label: "All", path: "/color-palettes", key: "c", icon: Palette },
  ] },
  { kind: "branch", label: "Calories", icon: Apple, children: [
    { kind: "leaf", label: "Everything", path: "/calories", key: "a", icon: Apple },
  ] },
];

const EDGE_MARGIN = 32;
const PREFERRED_NODE_R = 36;
const MIN_NODE_R = 20;
const LABEL_PAD = 10;
const INNER_RING_RATIO = 0.5;
const SEP_BUMP = 0.3;
const SWEEP_START = -Math.PI / 2;
const SWEEP = 2 * Math.PI;

type Layout = {
  outerR: number;
  innerR: number;
  nodeR: number;
  centerR: number;
  iconSize: number;
  labelFont: number;
  canvas: number;
  vw: number;
  vh: number;
};

function computeLayout(vw: number, vh: number): Layout {
  const leafCount = NAV.reduce((s, b) => s + b.children.length, 0);
  const branchCount = NAV.length;
  const effectiveSlots = leafCount + (branchCount - 1) * SEP_BUMP;
  const anglePerSlot = SWEEP / effectiveSlots;

  const slotHalfWidth = PREFERRED_NODE_R + LABEL_PAD;
  const requiredR = slotHalfWidth / Math.sin(anglePerSlot / 2);

  const availableR =
    Math.min(vw, vh) / 2 - EDGE_MARGIN - PREFERRED_NODE_R - LABEL_PAD;

  const outerR = Math.max(MIN_NODE_R * 4, Math.min(requiredR, availableR));
  const shrinkFactor = outerR < requiredR ? outerR / requiredR : 1;
  const nodeR = Math.max(
    MIN_NODE_R,
    Math.floor(PREFERRED_NODE_R * shrinkFactor)
  );
  const innerR = outerR * INNER_RING_RATIO;
  const centerR = nodeR + 8;
  const iconSize = Math.max(12, Math.round(nodeR * 0.6));
  const labelFont = Math.max(9, Math.round(nodeR * 0.32));
  const canvas = (outerR + nodeR + LABEL_PAD + EDGE_MARGIN) * 2;

  return { outerR, innerR, nodeR, centerR, iconSize, labelFont, canvas, vw, vh };
}

function useLayout(): Layout {
  const [size, setSize] = useState({ w: 1400, h: 900 });
  useEffect(() => {
    const onResize = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return useMemo(() => computeLayout(size.w, size.h), [size]);
}

type Placed = {
  kind: "branch" | "leaf";
  node: Branch | Leaf;
  x: number;
  y: number;
};

function usePlacements(layout: Layout): Placed[] {
  return useMemo(() => {
    const rootData: Root = { kind: "root", children: NAV };
    const root = d3.hierarchy<NavNode>(rootData, (d) =>
      d.kind === "leaf" ? undefined : d.children
    );
    d3
      .tree<NavNode>()
      .size([SWEEP, 1])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1 + SEP_BUMP))(root);

    const out: Placed[] = [];
    root.each((n) => {
      if (n.depth === 0) return;
      const angle = SWEEP_START + (n as unknown as { x: number }).x;
      const r = n.depth === 1 ? layout.innerR : layout.outerR;
      out.push({
        kind: n.data.kind === "branch" ? "branch" : "leaf",
        node: n.data as Branch | Leaf,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    });
    return out;
  }, [layout]);
}

export function RadialMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const layout = useLayout();
  const placements = usePlacements(layout);

  const keyMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of NAV) for (const l of b.children) m.set(l.key, l.path);
    return m;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const path = keyMap.get(e.key);
      if (path) {
        e.preventDefault();
        setOpen(false);
        router.push(path);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, keyMap, router]);

  if (!open) {
    return (
      <button
        aria-label="Open radial menu (⌘K)"
        title="⌘K"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 h-11 w-11 rounded-full bg-neutral-900 text-white shadow-lg flex items-center justify-center hover:bg-neutral-800 transition"
      >
        <Command size={18} />
      </button>
    );
  }

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-40 bg-black/25"
      />
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          width: layout.canvas,
          height: layout.canvas,
          transform: "translate(-50%, -50%)",
        }}
      >
        <svg
          width={layout.canvas}
          height={layout.canvas}
          viewBox={`${-layout.canvas / 2} ${-layout.canvas / 2} ${layout.canvas} ${layout.canvas}`}
          className="pointer-events-auto"
          style={{ overflow: "visible" }}
        >
          {placements.map((p, i) => (
            <line
              key={`spoke-${i}`}
              x1={0}
              y1={0}
              x2={p.x}
              y2={p.y}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth={1}
            />
          ))}

          <g>
            <circle r={layout.centerR} fill="#111" />
            <foreignObject
              x={-layout.centerR / 2}
              y={-layout.centerR / 2}
              width={layout.centerR}
              height={layout.centerR}
            >
              <div className="flex h-full w-full items-center justify-center text-white">
                <Command size={Math.round(layout.iconSize * 1.1)} />
              </div>
            </foreignObject>
          </g>

          {placements.map((p, i) => {
            const isLeaf = p.kind === "leaf";
            const Icon = p.node.icon;
            return (
              <g
                key={`n-${i}`}
                transform={`translate(${p.x},${p.y})`}
                style={{ cursor: isLeaf ? "pointer" : "default" }}
                onClick={() => {
                  if (isLeaf) {
                    setOpen(false);
                    router.push((p.node as Leaf).path);
                  }
                }}
              >
                <title>{p.node.label}</title>
                <circle
                  r={layout.nodeR}
                  fill={isLeaf ? "white" : "#f5f5f5"}
                  stroke="#111"
                  strokeWidth={isLeaf ? 1.5 : 1}
                />
                <foreignObject
                  x={-layout.iconSize / 2}
                  y={-layout.iconSize / 2 - layout.nodeR * 0.2}
                  width={layout.iconSize}
                  height={layout.iconSize}
                >
                  <div className="flex h-full w-full items-center justify-center text-neutral-900">
                    <Icon size={layout.iconSize} />
                  </div>
                </foreignObject>
                <text
                  y={layout.nodeR / 2 + 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={layout.labelFont}
                  fontWeight={500}
                  fill="#111"
                >
                  {p.node.label}
                </text>
                {isLeaf && (
                  <g
                    transform={`translate(${layout.nodeR - 4}, ${-layout.nodeR + 4})`}
                  >
                    <circle r={Math.max(9, layout.nodeR * 0.32)} fill="#111" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={Math.max(10, layout.nodeR * 0.36)}
                      fontWeight={700}
                      fontFamily="ui-monospace, SFMono-Regular, monospace"
                    >
                      {(p.node as Leaf).key}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}
