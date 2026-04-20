"use client";

import type { KeyboardEvent } from "react";

const FOCUSABLE =
  'input:not([type="hidden"]), textarea, button, [role="button"], [tabindex]:not([tabindex="-1"])';

function focusInCell(td: HTMLTableCellElement): boolean {
  let focusable = td.querySelector<HTMLElement>(FOCUSABLE);
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
  const rowIndex = allRows.indexOf(tr);
  if (rowIndex === -1) return;
  const cells = Array.from(tr.cells);
  const colIndex = cells.indexOf(td);

  // Home / End / Cmd+Home / Cmd+End
  if (key === "Home" || key === "End") {
    if (e.metaKey || e.ctrlKey) {
      const targetRow = key === "Home" ? allRows[0] : allRows[allRows.length - 1];
      if (!targetRow) return;
      const targetCells = Array.from(targetRow.cells);
      const targetTd =
        key === "Home" ? targetCells[0] : targetCells[targetCells.length - 1];
      if (targetTd && focusInCell(targetTd)) e.preventDefault();
      return;
    }
    const targetTd = key === "Home" ? cells[0] : cells[cells.length - 1];
    if (targetTd && focusInCell(targetTd)) e.preventDefault();
    return;
  }

  // Tab / Shift+Tab move horizontally, wrapping into the next/previous row.
  if (key === "Tab") {
    let nextTr = tr;
    let nextColIndex = e.shiftKey ? colIndex - 1 : colIndex + 1;
    if (nextColIndex < 0) {
      if (rowIndex === 0) return;
      nextTr = allRows[rowIndex - 1];
      nextColIndex = nextTr.cells.length - 1;
    } else if (nextColIndex >= cells.length) {
      if (rowIndex === allRows.length - 1) return;
      nextTr = allRows[rowIndex + 1];
      nextColIndex = 0;
    }
    const nextCells = Array.from(nextTr.cells);
    const nextTd = nextCells[nextColIndex];
    if (nextTd && focusInCell(nextTd)) e.preventDefault();
    return;
  }

  // Arrow navigation
  let nextRowIndex = rowIndex;
  let nextColIndex = colIndex;
  if (effectiveKey === "ArrowUp") nextRowIndex--;
  else if (effectiveKey === "ArrowDown") nextRowIndex++;
  else if (effectiveKey === "ArrowLeft") nextColIndex--;
  else if (effectiveKey === "ArrowRight") nextColIndex++;

  if (nextRowIndex < 0 || nextRowIndex >= allRows.length) return;
  const nextTr = allRows[nextRowIndex];
  const nextCells = Array.from(nextTr.cells);
  if (nextCells.length === 0) return;
  // Rows with fewer cells (e.g. a colspan "+ New" row) clamp to the nearest cell.
  const targetCol = Math.max(0, Math.min(nextColIndex, nextCells.length - 1));
  const nextTd = nextCells[targetCol];
  if (!nextTd) return;

  if (focusInCell(nextTd)) e.preventDefault();
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
