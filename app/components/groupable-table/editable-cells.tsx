"use client";

import { useState, useTransition } from "react";

export function EditableText({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <input
        type="text"
        defaultValue={value}
        autoFocus
        className="gt-input"
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value !== value) startTransition(() => onSave(e.target.value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span className={`gt-editable ${isPending ? "gt-pending" : ""}`} onClick={() => setEditing(true)}>
      {value || <span className="gt-empty">—</span>}
    </span>
  );
}

export function EditableSelect({
  value,
  options,
  onSave,
}: {
  value: string | null;
  options: string[];
  onSave: (v: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value || ""}
      className={`gt-select ${isPending ? "gt-pending" : ""}`}
      onChange={(e) => startTransition(() => onSave(e.target.value))}
    >
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
