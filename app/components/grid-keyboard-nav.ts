"use client";

import type { KeyboardEvent } from "react";

const FOCUSABLE =
  'input:not([type="hidden"]), textarea, button, [role="button"], [tabindex]:not([tabindex="-1"])';

function focusInCell(td: HTMLTableCellElement, reverse = false): boolean {
  const all = Array.from(td.querySelectorAll<HTMLElement>(FOCUSABLE));
  let focusable: HTMLElement | null = reverse
    ? all[all.length - 1] ?? null
    : all[0] ?? null;
  if (!focusable && td.tabIndex >= 0) focusable = td;
  if (!focusable) return false;
  focusable.focus();
  if (focusable.tagName === "INPUT" || focusable.tagName === "TEXTAREA") {
    (focusable as HTMLInputElement).select?.();
  }
  return true;
}

function navigableRows(tbody: HTMLTableSectionElement): HTMLTableRowElement[] {
  return Array.from(tbody.children).filter(
    (el): el is HTMLTableRowElement =>
      el.tagName === "TR" &&
      el.getAttribute("aria-hidden") !== "true" &&
      (el as HTMLTableRowElement).cells.length > 0,
  );
}

/**
 * Build a rowspan/colspan-aware occupancy grid. `grid[r][c]` is the <td> that
 * visually occupies row `r`, column `c`. A rowspanned icicle cell appears in
 * every row it spans, at the same visual column — so keyboard navigation can
 * skip past it instead of falling into the wrong task column.
 */
function buildVisualGrid(
  rows: HTMLTableRowElement[],
): HTMLTableCellElement[][] {
  const grid: HTMLTableCellElement[][] = rows.map(() => []);
  rows.forEach((tr, r) => {
    let col = 0;
    for (const td of Array.from(tr.cells)) {
      while (grid[r][col]) col++;
      const colspan = td.colSpan || 1;
      const rowspan = td.rowSpan || 1;
      for (let dr = 0; dr < rowspan && r + dr < rows.length; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          grid[r + dr][col + dc] = td;
        }
      }
      col += colspan;
    }
  });
  return grid;
}

function visualPosition(
  grid: HTMLTableCellElement[][],
  td: HTMLTableCellElement,
): { row: number; col: number } | null {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === td) return { row: r, col: c };
    }
  }
  return null;
}

export function handleGridKeyDown(e: KeyboardEvent<HTMLElement>) {
  const key = e.key;

  // Vim-style j/k as aliases for ArrowDown/ArrowUp — only when not typing into
  // an input/textarea (otherwise "j" wouldn't be typeable).
  const target = e.target as HTMLElement;
  const tag = target.tagName;
  const isInput = tag === "INPUT" || tag === "TEXTAREA";
  let effectiveKey = key;
  if (!isInput && (key === "j" || key === "k")) {
    effectiveKey = key === "j" ? "ArrowDown" : "ArrowUp";
  }

  const isNavKey =
    effectiveKey === "ArrowUp" ||
    effectiveKey === "ArrowDown" ||
    effectiveKey === "ArrowLeft" ||
    effectiveKey === "ArrowRight" ||
    key === "Tab" ||
    key === "Home" ||
    key === "End";
  if (!isNavKey) return;

  // In text inputs, only navigate out on Left/Right when cursor is at a
  // boundary; preserve native cursor movement otherwise.
  if (
    isInput &&
    (effectiveKey === "ArrowLeft" || effectiveKey === "ArrowRight")
  ) {
    const input = target as HTMLInputElement | HTMLTextAreaElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (effectiveKey === "ArrowLeft" && !(start === 0 && end === 0)) return;
    if (effectiveKey === "ArrowRight") {
      const len = input.value.length;
      if (!(start === len && end === len)) return;
    }
  }

  const td = target.closest("td") as HTMLTableCellElement | null;
  if (!td) return;
  const tr = td.parentElement as HTMLTableRowElement | null;
  if (!tr || tr.tagName !== "TR") return;
  const tbody = tr.parentElement as HTMLTableSectionElement | null;
  if (!tbody || tbody.tagName !== "TBODY") return;

  const allRows = navigableRows(tbody);
  const grid = buildVisualGrid(allRows);
  const pos = visualPosition(grid, td);
  if (!pos) return;
  const maxCol = Math.max(...grid.map((r) => r.length)) - 1;

  // Home / End / Cmd+Home / Cmd+End — visual-column aware.
  if (key === "Home" || key === "End") {
    if (e.metaKey || e.ctrlKey) {
      const r = key === "Home" ? 0 : grid.length - 1;
      const targetTd =
        key === "Home"
          ? grid[r]?.[0]
          : grid[r]?.[grid[r].length - 1];
      if (targetTd && focusInCell(targetTd)) e.preventDefault();
      return;
    }
    const row = grid[pos.row];
    const targetTd =
      key === "Home" ? row[0] : row[row.length - 1];
    if (targetTd && focusInCell(targetTd) && targetTd !== td) e.preventDefault();
    return;
  }

  // Tab / Shift+Tab move horizontally, wrapping into the next/previous row.
  // Exception: if the current cell has multiple focusable children (e.g. a
  // project name input + a "Commit" button), let the browser walk through
  // them first; only jump to the next cell when the active element is the
  // last (Shift+Tab: first) focusable inside the current <td>.
  if (key === "Tab") {
    const dir = e.shiftKey ? -1 : 1;
    const children = Array.from(td.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => !el.hasAttribute("disabled"));
    if (children.length > 1) {
      const idx = children.indexOf(document.activeElement as HTMLElement);
      if (dir > 0 && idx >= 0 && idx < children.length - 1) return;
      if (dir < 0 && idx > 0) return;
    }
    let r = pos.row;
    let c = pos.col + dir;
    while (r >= 0 && r < grid.length) {
      while (c >= 0 && c <= maxCol) {
        const next = grid[r][c];
        if (next && next !== td) {
          focusInCell(next, dir < 0);
          e.preventDefault();
          return;
        }
        c += dir;
      }
      r += dir;
      if (r < 0 || r >= grid.length) return;
      c = dir > 0 ? 0 : maxCol;
    }
    return;
  }

  // Arrow nav — step through the visual grid so rowspanned icicles skip to
  // the next row where the column holds a *different* <td>.
  let nextRow = pos.row;
  let nextCol = pos.col;
  const rowDelta =
    effectiveKey === "ArrowUp" ? -1 : effectiveKey === "ArrowDown" ? 1 : 0;
  const colDelta =
    effectiveKey === "ArrowLeft"
      ? -1
      : effectiveKey === "ArrowRight"
        ? 1
        : 0;
  if (rowDelta === 0 && colDelta === 0) return;

  while (true) {
    nextRow += rowDelta;
    nextCol += colDelta;
    if (nextRow < 0 || nextRow >= grid.length) return;
    if (nextCol < 0 || nextCol > maxCol) return;
    const candidate = grid[nextRow]?.[nextCol];
    if (!candidate) {
      if (rowDelta !== 0) {
        // Row lacks this visual column (e.g. narrow "+ New" helper rows); clamp.
        const row = grid[nextRow];
        const clamped =
          row[Math.max(0, Math.min(nextCol, row.length - 1))];
        if (clamped && clamped !== td) {
          if (focusInCell(clamped)) e.preventDefault();
          return;
        }
        continue;
      }
      return;
    }
    if (candidate === td) continue; // same rowspan/colspan cell — keep stepping
    if (focusInCell(candidate)) e.preventDefault();
    return;
  }
}

/**
 * Focus the first editable cell in a grid. Returns true on success. Caller
 * should call this on Enter when nothing useful is currently focused.
 */
export function focusFirstEditableCell(root: HTMLElement): boolean {
  const tbody = root.querySelector("tbody");
  if (!tbody) return false;
  const rows = navigableRows(tbody as HTMLTableSectionElement);
  for (const row of rows) {
    // Skip "+ New" helper rows — those are single-cell action rows, not data.
    if (row.cells.length === 1 && row.cells[0].classList.contains("themed-new-row-cell")) {
      continue;
    }
    for (const cell of Array.from(row.cells)) {
      if (focusInCell(cell)) return true;
    }
  }
  return false;
}

/**
 * Click the first visible "+ New …" row in the grid. Used for Cmd+N.
 */
export function clickFirstNewRow(root: HTMLElement): boolean {
  const cell = root.querySelector<HTMLElement>(
    "tbody td.themed-new-row-cell",
  );
  if (!cell) return false;
  cell.click();
  return true;
}
