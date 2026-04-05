"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { contrastText } from "./styles";

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

  if (editing) {
    return (
      <input
        type="text" defaultValue={value} autoFocus className="gt-input"
        style={{ width: "100%" }}
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
            onClick={() => { startTransition(() => onSave("")); setOpen(false); }}
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
                onClick={() => { startTransition(() => onSave(o)); setOpen(false); }}
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 2, height: "100%" }}>
      <img src={`/api/teable-image/${token}`} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 3 }} loading="lazy" />
    </div>
  );
}
