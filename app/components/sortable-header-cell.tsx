"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

/**
 * A <th> that participates in a horizontal-sortable column reorder. The full
 * cell is the sortable node (so transform/transition apply to the whole
 * header), but only the inner drag handle carries the dnd-kit listeners —
 * leaving room for other interactive elements inside the TH (e.g. a
 * ColumnResizer pinned to the right edge).
 *
 * Usage:
 *   <SortableHeaderCell id="resource" className={headerClass}
 *     extras={<ColumnResizer ... />}>
 *     Resource
 *   </SortableHeaderCell>
 */
export function SortableHeaderCell({
  id,
  className,
  style,
  children,
  extras,
  enableDrag = true,
}: {
  id: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  extras?: React.ReactNode;
  enableDrag?: boolean;
}) {
  const sortable = useSortable({ id, disabled: !enableDrag });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    sortable;
  const combinedStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : style?.zIndex,
    opacity: isDragging ? 0.85 : style?.opacity,
  };
  return (
    <th ref={setNodeRef} style={combinedStyle} className={className} {...attributes}>
      <span
        {...(enableDrag ? listeners : {})}
        className={cn(
          "inline-flex",
          enableDrag && "cursor-grab select-none",
        )}
        title={enableDrag ? "Drag to reorder column" : undefined}
      >
        {children}
      </span>
      {extras}
    </th>
  );
}
