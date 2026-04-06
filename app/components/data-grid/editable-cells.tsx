"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { contrastText } from "./styles";

/** After unmounting an input, refocus the closest gridcell ancestor. */
function refocusCell(el: HTMLElement | null) {
  const cell = el?.closest<HTMLElement>('[role="gridcell"]');
  if (cell) requestAnimationFrame(() => cell.focus());
}

export function EditableText({
  value, onSave, className, style,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text" defaultValue={value} autoFocus className="gt-input"
        style={{ width: "100%" }}
        onBlur={(e) => {
          const el = e.target as HTMLElement;
          setEditing(false);
          if (e.target.value !== value) startTransition(() => onSave(e.target.value));
          refocusCell(el);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            const el = e.target as HTMLElement;
            setEditing(false);
            refocusCell(el);
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={`gt-editable ${isPending ? "gt-pending" : ""} ${className || ""}`}
      style={style}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {value || <span className="gt-empty">—</span>}
    </span>
  );
}

export function EditableSelect({
  value, options, onSave, optionColors,
}: {
  value: string | null;
  options: string[];
  onSave: (v: string) => void;
  optionColors?: { [optionValue: string]: string };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const close = () => { setOpen(false); refocusCell(ref.current); };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", overflow: open ? "visible" : undefined }}>
      <span
        className={`gt-picklist ${isPending ? "gt-pending" : ""}`}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || <span className="gt-empty">—</span>}
        </span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 10, flexShrink: 0, marginLeft: 4 }}>▿</span>
      </span>
      {open && (
        <div className="gt-picklist-dropdown" style={{ color: "var(--foreground)" }} onClick={(e) => e.stopPropagation()}>
          <div
            className={`gt-picklist-option ${!value ? "gt-picklist-active" : ""}`}
            style={{ color: "var(--muted-foreground)" }}
            onClick={() => { startTransition(() => onSave("")); close(); }}
          >—</div>
          {options.map((o) => {
            const bg = optionColors?.[o];
            return (
              <div
                key={o}
                className={`gt-picklist-option ${value === o ? "gt-picklist-active" : ""}`}
                style={bg ? {
                  background: bg,
                  color: contrastText(bg),
                  borderRadius: 4,
                  margin: "2px 4px",
                  padding: "5px 10px",
                } : undefined}
                onClick={() => { startTransition(() => onSave(o)); close(); }}
              >{o}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ImageCell({ value }: { value: unknown }) {
  if (!value) return null;
  let token = "";
  if (typeof value === "string") {
    try { const p = JSON.parse(value); if (Array.isArray(p) && p[0]?.token) token = p[0].token; } catch { /* */ }
  } else if (Array.isArray(value) && value[0]?.token) {
    token = value[0].token;
  }
  if (!token) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <img src={`/api/teable-image/${token}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
    </div>
  );
}
