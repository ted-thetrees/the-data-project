"use client";

import {
  useState,
  useTransition,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  itemLabel = "this record",
  rowStyle,
  trProps,
  children,
}: RowContextMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await onDelete();
      setConfirmOpen(false);
    });
  };

  const onRowKeyDown = (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (e.key !== "Delete") return;
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    // Don't hijack Delete while the user is editing text / numbers.
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (target.isContentEditable) return;
    e.preventDefault();
    setConfirmOpen(true);
  };

  return (
    <>
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
          <ContextMenuItem
            onClick={() => setConfirmOpen(true)}
            variant="destructive"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm rounded-none p-4 gap-3 text-balance">
          <DialogHeader className="pr-8">
            <DialogTitle className="leading-relaxed">
              Delete {itemLabel}?
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
