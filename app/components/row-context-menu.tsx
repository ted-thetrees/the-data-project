"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type CSSProperties,
  type HTMLAttributes,
  type Ref,
} from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface RowContextMenuProps {
  onDelete: () => void | Promise<void>;
  itemLabel?: string;
  rowStyle?: CSSProperties;
  /** Extra props spread onto the rendered <tr> (e.g., setNodeRef, dnd-kit attributes). */
  trProps?: HTMLAttributes<HTMLTableRowElement> & {
    ref?: Ref<HTMLTableRowElement>;
  };
  children: ReactNode;
}

export function RowContextMenu({
  onDelete,
  rowStyle,
  trProps,
  children,
}: RowContextMenuProps) {
  const runDelete = () => {
    void onDelete();
  };

  const onRowKeyDown = (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (e.key !== "Delete") return;
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (target.isContentEditable) return;
    e.preventDefault();
    runDelete();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <tr
            {...trProps}
            style={{ ...rowStyle, ...trProps?.style }}
            onKeyDown={onRowKeyDown}
          />
        }
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={runDelete} variant="destructive">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
