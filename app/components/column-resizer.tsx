"use client";

import React from "react";

export function ColumnResizer({
  columnIndex,
  currentWidth,
  onResize,
  onResizeStart,
  minWidth = 60,
}: {
  columnIndex: number;
  currentWidth: number;
  onResize: (w: number) => void;
  onResizeStart?: () => void;
  minWidth?: number;
}) {
  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const table = (e.currentTarget as HTMLElement).closest(
      "table",
    ) as HTMLTableElement | null;
    const colEl = table?.querySelectorAll("col")[columnIndex] as
      | HTMLTableColElement
      | null;
    // Trust the DOM-rendered width as the baseline: `currentWidth` may be a
    // fallback (e.g. 100) when no width was saved yet, but the column is
    // actually sized by content in that case.
    const actualStart = colEl?.offsetWidth ?? currentWidth;
    let newWidth = actualStart;
    // Capture the current table width so we can grow it by the same delta
    // during the drag — otherwise other columns would flex to maintain total
    // width and "snap" back on mouseup when React re-renders with the new
    // sum.
    const startTableWidth = table ? table.offsetWidth : null;

    // Let the parent lock in all current column widths before we start
    // moving anything, so the post-release re-render doesn't snap other
    // columns back to their content-based widths.
    onResizeStart?.();

    const onMove = (ev: MouseEvent) => {
      const rawDelta = ev.clientX - startX;
      // Clamp so the targeted column never shrinks below minWidth.
      const delta = Math.max(rawDelta, minWidth - actualStart);
      newWidth = actualStart + delta;
      if (colEl) colEl.style.width = `${newWidth}px`;
      if (table && startTableWidth != null) {
        table.style.width = `${startTableWidth + delta}px`;
      }
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
