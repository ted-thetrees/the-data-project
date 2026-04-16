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

const SWEEP_START = -Math.PI / 2 - 0.45;
const SWEEP = Math.PI / 2 + 0.9;
const INNER_R = 180;
const OUTER_R = 330;
const NODE_R = 34;
const CENTER_R = 40;
const ICON_SIZE = 20;
const LABEL_FONT = 11;
const CANVAS = 560;
const ORIGIN_INSET = 60;

type Placed = { kind: "branch" | "leaf"; node: Branch | Leaf; x: number; y: number };

function usePlacements(): Placed[] {
  return useMemo(() => {
    const rootData: Root = { kind: "root", children: NAV };
    const root = d3.hierarchy<NavNode>(rootData, (d) =>
      d.kind === "leaf" ? undefined : d.children
    );
    d3
      .tree<NavNode>()
      .size([SWEEP, 1])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.8))(root);

    const out: Placed[] = [];
    root.each((n) => {
      if (n.depth === 0) return;
      const angle = SWEEP_START + (n as unknown as { x: number }).x;
      const r = n.depth === 1 ? INNER_R : OUTER_R;
      out.push({
        kind: n.data.kind === "branch" ? "branch" : "leaf",
        node: n.data as Branch | Leaf,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    });
    return out;
  }, []);
}

export function RadialMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const placements = usePlacements();

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
        style={{ bottom: 16, left: 16, width: CANVAS, height: CANVAS }}
      >
        <svg
          width={CANVAS}
          height={CANVAS}
          viewBox={`${-ORIGIN_INSET} ${-(CANVAS - ORIGIN_INSET)} ${CANVAS} ${CANVAS}`}
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
            <circle r={CENTER_R} fill="#111" />
            <foreignObject x={-CENTER_R / 2} y={-CENTER_R / 2} width={CENTER_R} height={CENTER_R}>
              <div className="flex h-full w-full items-center justify-center text-white">
                <Command size={22} />
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
                  r={NODE_R}
                  fill={isLeaf ? "white" : "#f5f5f5"}
                  stroke="#111"
                  strokeWidth={isLeaf ? 1.5 : 1}
                />
                <foreignObject
                  x={-ICON_SIZE / 2}
                  y={-ICON_SIZE / 2 - 6}
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                >
                  <div className="flex h-full w-full items-center justify-center text-neutral-900">
                    <Icon size={ICON_SIZE} />
                  </div>
                </foreignObject>
                <text
                  y={NODE_R / 2 + 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={LABEL_FONT}
                  fontWeight={500}
                  fill="#111"
                >
                  {p.node.label}
                </text>
                {isLeaf && (
                  <g transform={`translate(${NODE_R - 4}, ${-NODE_R + 4})`}>
                    <circle r={11} fill="#111" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={12}
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
