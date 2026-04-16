"use client";

import type { KeyboardEvent } from "react";

const FOCUSABLE =
  'input:not([type="hidden"]), textarea, button, [role="button"], [tabindex]:not([tabindex="-1"])';

export function handleGridKeyDown(e: KeyboardEvent<HTMLElement>) {
  const key = e.key;
  if (
    key !== "ArrowUp" &&
    key !== "ArrowDown" &&
    key !== "ArrowLeft" &&
    key !== "ArrowRight"
  )
    return;

  const target = e.target as HTMLElement;
  const tag = target.tagName;
  const isInput = tag === "INPUT" || tag === "TEXTAREA";

  // In text inputs, only navigate out on Left/Right when cursor is at a boundary,
  // otherwise preserve native cursor movement.
  if (isInput && (key === "ArrowLeft" || key === "ArrowRight")) {
    const input = target as HTMLInputElement | HTMLTextAreaElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (key === "ArrowLeft" && !(start === 0 && end === 0)) return;
    if (key === "ArrowRight") {
      const len = input.value.length;
      if (!(start === len && end === len)) return;
    }
  }

  const td = target.closest("td");
  if (!td) return;
  const tr = td.parentElement as HTMLTableRowElement | null;
  if (!tr || tr.tagName !== "TR") return;
  const tbody = tr.parentElement as HTMLTableSectionElement | null;
  if (!tbody || tbody.tagName !== "TBODY") return;

  // Navigable rows: anything that isn't an aria-hidden spacer and has at least one cell.
  const allRows = Array.from(tbody.children).filter(
    (el): el is HTMLTableRowElement =>
      el.tagName === "TR" &&
      el.getAttribute("aria-hidden") !== "true" &&
      (el as HTMLTableRowElement).cells.length > 0,
  );
  const rowIndex = allRows.indexOf(tr);
  if (rowIndex === -1) return;
  const cells = Array.from(tr.cells);
  const colIndex = cells.indexOf(td);

  let nextRowIndex = rowIndex;
  let nextColIndex = colIndex;
  if (key === "ArrowUp") nextRowIndex--;
  else if (key === "ArrowDown") nextRowIndex++;
  else if (key === "ArrowLeft") nextColIndex--;
  else if (key === "ArrowRight") nextColIndex++;

  if (nextRowIndex < 0 || nextRowIndex >= allRows.length) return;
  const nextTr = allRows[nextRowIndex];
  const nextCells = Array.from(nextTr.cells);
  if (nextCells.length === 0) return;
  // Rows with fewer cells (e.g. a colspan "+ New" row) clamp to the nearest cell.
  const targetCol = Math.max(0, Math.min(nextColIndex, nextCells.length - 1));
  const nextTd = nextCells[targetCol];
  if (!nextTd) return;

  let focusable = nextTd.querySelector<HTMLElement>(FOCUSABLE);
  if (!focusable && nextTd.tabIndex >= 0) focusable = nextTd;
  if (!focusable) return;

  e.preventDefault();
  focusable.focus();
  if (focusable.tagName === "INPUT" || focusable.tagName === "TEXTAREA") {
    (focusable as HTMLInputElement).select?.();
  }
}
