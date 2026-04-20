"use client";

import { useEffect, useState } from "react";
import {
  focusFirstEditableCell,
  clickFirstNewRow,
} from "@/components/grid-keyboard-nav";
import { KeyboardCheatsheet } from "@/components/keyboard-cheatsheet";

function isIgnoredTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
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
    <KeyboardCheatsheet
      open={cheatsheetOpen}
      onOpenChange={setCheatsheetOpen}
    />
  );
}
