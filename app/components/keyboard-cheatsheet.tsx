"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = MAC ? "⌘" : "Ctrl";
// Apple Magic Keyboard has no dedicated Home/End keys — macOS generates them
// from fn + ←/→.
const HOME = MAC ? "fn+←" : "Home";
const END = MAC ? "fn+→" : "End";

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "↑ ↓ ← →", desc: "Move between cells" },
  { keys: "j / k", desc: "Move row down / up" },
  { keys: "Tab / ⇧Tab", desc: "Next / previous cell (wraps rows)" },
  { keys: `${HOME} / ${END}`, desc: "First / last cell in row" },
  { keys: `${MOD}+${HOME} / ${MOD}+${END}`, desc: "First / last cell in table" },
  { keys: "Return", desc: "Enter first editable cell (when nothing focused)" },
  { keys: "Return", desc: "Open pill picker / commit text edit" },
  { keys: "Esc", desc: "Cancel edit / close popover" },
  { keys: "Delete", desc: "Delete the focused row (with confirmation)" },
  { keys: `${MOD}+N`, desc: "New row" },
  { keys: `${MOD}+Return`, desc: "Commit project (Projects Main)" },
  { keys: "⌥↑ / ⌥↓", desc: "Reorder task within project (Projects Main)" },
  { keys: "⌥← / ⌥→", desc: "Prev / next month (date picker)" },
  { keys: "⌥⇧← / ⌥⇧→", desc: "Prev / next year (date picker)" },
  { keys: `? or ${MOD}+/`, desc: "Show this cheatsheet" },
];

export function KeyboardCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-none p-5 gap-3">
        <DialogHeader className="pr-8">
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="contents">
              <div className="font-mono text-[color:var(--muted-foreground)] whitespace-nowrap">
                {s.keys}
              </div>
              <div>{s.desc}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
