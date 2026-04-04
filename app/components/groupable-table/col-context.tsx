"use client";

import { createContext, useContext, useRef, useCallback } from "react";

export const ColContext = createContext<{
  widths: number[];
  onResize: (i: number, delta: number) => void;
}>({ widths: [], onResize: () => {} });

export function ColResizer({ index }: { index: number }) {
  const { onResize } = useContext(ColContext);
  const startX = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    const move = (e: MouseEvent) => {
      onResize(index, e.clientX - startX.current);
      startX.current = e.clientX;
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [index, onResize]);

  return (
    <div
      style={{
        position: "absolute", top: 0, bottom: 0, right: -2, width: 5,
        cursor: "col-resize", zIndex: 10,
      }}
      onMouseDown={onMouseDown}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--ring)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    />
  );
}
