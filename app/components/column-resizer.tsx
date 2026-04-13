"use client";

import React from "react";

export function ColumnResizer({
  columnIndex,
  currentWidth,
  onResize,
  minWidth = 60,
}: {
  columnIndex: number;
  currentWidth: number;
  onResize: (w: number) => void;
  minWidth?: number;
}) {
  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    let newWidth = currentWidth;
    const table = (e.currentTarget as HTMLElement).closest("table");
    const colEl = table?.querySelectorAll("col")[columnIndex] as
      | HTMLTableColElement
      | null;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      newWidth = Math.max(minWidth, currentWidth + delta);
      if (colEl) colEl.style.width = `${newWidth}px`;
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onResize(newWidth);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onMouseDown={startResize}
      title="Drag to resize"
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "var(--resize-handle-width)",
        cursor: "col-resize",
        userSelect: "none",
      }}
    />
  );
}
