"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  focusFirstEditableCell,
  clickFirstNewRow,
} from "@/components/grid-keyboard-nav";
import { KeyboardCheatsheet } from "@/components/keyboard-cheatsheet";
import { undoLast } from "@/lib/undo";

function isIgnoredTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  // Inside a popover / dialog / menu / listbox — e.g. calendar day cells in
  // the Tickle date picker. Those components own their own Enter handling;
  // don't steal it to focus the first cell after they close.
  if (
    el.closest(
      '[data-slot="popover-content"], [role="dialog"], [role="menu"], [role="listbox"]',
    )
  )
    return true;
  return false;
}

/**
 * Page-level keyboard shortcuts for every grid page.
 *
 * - **Enter** (when nothing is focused): jump into the first editable cell.
 * - **Cmd/Ctrl+N**: trigger the page's "+ New …" row.
 * - **?** or **Cmd/Ctrl+/**: open the keyboard cheatsheet.
 *
 * Mounts once per page. Safe to include on pages without a table — it
 * silently no-ops when it can't find a grid.
 */
export function GridPageShortcuts() {
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, startUndo] = useTransition();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = e.key;

      // Open cheatsheet: ? or Cmd/Ctrl+/
      if (
        (key === "?" && !isIgnoredTarget(e.target)) ||
        (key === "/" && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault();
        setCheatsheetOpen(true);
        return;
      }

      // Cmd/Ctrl+Z → undo. Works even when focused inside a text field so
      // quickly committed edits can be reversed.
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (key === "z" || key === "Z")
      ) {
        e.preventDefault();
        startUndo(async () => {
          const desc = await undoLast();
          showToast(desc ? `Undid: ${desc}` : "Nothing to undo");
        });
        return;
      }

      if (isIgnoredTarget(e.target)) return;

      // Cmd/Ctrl+N → "+ New …"
      if (key === "n" && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (clickFirstNewRow(document.body)) e.preventDefault();
        return;
      }

      // Enter on body: focus first editable cell.
      if (key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (focusFirstEditableCell(document.body)) e.preventDefault();
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <KeyboardCheatsheet
        open={cheatsheetOpen}
        onOpenChange={setCheatsheetOpen}
      />
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="undo-toast"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[color:var(--card)] text-[color:var(--foreground)] border border-[color:var(--border)] px-4 py-2 shadow-lg text-sm"
          style={{ borderRadius: "var(--radius-md)" }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
