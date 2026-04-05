"use client";

import { useState, useTransition, useContext } from "react";
import { ColContext, ColResizer } from "./col-context";
import { depthColor, GAP_PX, INDENT_PX } from "./styles";
import type { ColConfig } from "./types";

export function NewRow({
  visibleCols, depth, onCreate,
}: {
  visibleCols: ColConfig[];
  depth: number;
  onCreate: (fields: Record<string, string>) => Promise<void>;
}) {
  const { widths } = useContext(ColContext);
  const indent = depth * INDENT_PX;
  const bg = depthColor(depth);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasPendingData = Object.values(pending).some((v) => v.trim());

  const commit = () => {
    if (!hasPendingData) return;
    startTransition(async () => {
      await onCreate(pending);
      setPending({});
      setEditingKey(null);
    });
  };

  return (
    <div style={{
      display: "flex", alignItems: "stretch", marginLeft: indent, gap: GAP_PX,
      opacity: isPending ? "var(--pending-opacity)" : "var(--new-row-opacity)",
      transition: `opacity var(--transition-normal)`,
    }}
      onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.opacity = "var(--new-row-hover-opacity)"; }}
      onMouseLeave={(e) => { if (!isPending && !editingKey) e.currentTarget.style.opacity = "var(--new-row-opacity)"; }}
    >
      {visibleCols.map((col, i) => {
        const isLast = i === visibleCols.length - 1;
        const cellStyle: React.CSSProperties = {
          background: bg,
          ...(isLast ? { flex: 1, minWidth: widths[i] } : { width: widths[i], flexShrink: 0 }),
          position: "relative",
          borderBottom: `var(--border-width) var(--new-row-border-style) var(--border)`,
        };

        // Image columns get a placeholder
        if (col.type === "image") {
          return (
            <div key={col.key} className="gt-cell" style={cellStyle}>
              {!isLast && <ColResizer index={i} />}
            </div>
          );
        }

        const isEditing = editingKey === col.key;
        const value = pending[col.key] || "";

        if (isEditing) {
          if (col.type === "select") {
            return (
              <div key={col.key} className="gt-cell" style={cellStyle}>
                <select
                  autoFocus
                  className="gt-select"
                  style={{ width: "100%" }}
                  value={value}
                  onChange={(e) => {
                    const newPending = { ...pending, [col.key]: e.target.value };
                    setPending(newPending);
                    setEditingKey(null);
                    if (newPending.name?.trim()) {
                      startTransition(async () => {
                        await onCreate(newPending);
                        setPending({});
                      });
                    }
                  }}
                  onBlur={() => setEditingKey(null)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">—</option>
                  {col.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {!isLast && <ColResizer index={i} />}
              </div>
            );
          }

          return (
            <div key={col.key} className="gt-cell" style={cellStyle}>
              <input
                type="text"
                autoFocus
                className="gt-input"
                style={{ width: "100%" }}
                defaultValue={value}
                placeholder={col.key === "name" ? "New person..." : ""}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) {
                    const newPending = { ...pending, [col.key]: v };
                    setPending(newPending);
                    if (col.key === "name") {
                      startTransition(async () => {
                        await onCreate(newPending);
                        setPending({});
                      });
                    }
                  }
                  setEditingKey(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingKey(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {!isLast && <ColResizer index={i} />}
            </div>
          );
        }

        return (
          <div
            key={col.key}
            className="gt-cell"
            style={{ ...cellStyle, cursor: "text" }}
            onClick={() => setEditingKey(col.key)}
          >
            <span style={{ color: "var(--muted-foreground)", opacity: "var(--empty-opacity)", fontSize: "var(--new-row-placeholder-font-size)" }}>
              {value || (col.key === "name" ? "+" : "")}
            </span>
            {!isLast && <ColResizer index={i} />}
          </div>
        );
      })}
    </div>
  );
}
