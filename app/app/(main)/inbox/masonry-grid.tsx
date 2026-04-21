"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Item = { id: string; element: ReactNode };

function pickCols(width: number): number {
  if (width >= 1280) return 3;
  if (width >= 768) return 2;
  return 1;
}

function pickGap(width: number): number {
  return width < 640 ? 7 : 20;
}

type Pos = { top: number; left: number; width: number };

export function MasonryGrid({ items }: { items: Item[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [cols, setCols] = useState(3);
  const [gap, setGap] = useState(20);
  const [containerWidth, setContainerWidth] = useState(0);
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const update = () => {
      setCols(pickCols(window.innerWidth));
      setGap(pickGap(window.innerWidth));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const colWidth = containerWidth
    ? (containerWidth - gap * (cols - 1)) / cols
    : 0;

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    setContainerWidth((prev) => (prev === cw ? prev : cw));
    if (!cw) return;
    const w = (cw - gap * (cols - 1)) / cols;
    const colHeights: number[] = new Array(cols).fill(0);
    const next: Record<string, Pos> = {};
    for (const item of items) {
      const el = itemRefs.current.get(item.id);
      const h = el ? el.offsetHeight : 0;
      let minIdx = 0;
      for (let c = 1; c < cols; c++) {
        if (colHeights[c] < colHeights[minIdx]) minIdx = c;
      }
      next[item.id] = {
        top: colHeights[minIdx],
        left: minIdx * (w + gap),
        width: w,
      };
      colHeights[minIdx] += h + gap;
    }
    setPositions(next);
    setHeight(
      colHeights.length ? Math.max(0, ...colHeights.map((x) => x - gap)) : 0
    );
  }, [items, cols, gap]);

  useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(container);
    for (const el of itemRefs.current.values()) ro.observe(el);
    return () => ro.disconnect();
  }, [items, recompute]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: height || undefined }}
    >
      {items.map((item) => {
        const pos = positions[item.id];
        const style: CSSProperties = {
          position: "absolute",
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          width: pos?.width ?? colWidth ?? undefined,
          visibility: pos ? "visible" : "hidden",
        };
        return (
          <div
            key={item.id}
            ref={(el) => {
              if (el) itemRefs.current.set(item.id, el);
              else itemRefs.current.delete(item.id);
            }}
            style={style}
          >
            {item.element}
          </div>
        );
      })}
    </div>
  );
}
