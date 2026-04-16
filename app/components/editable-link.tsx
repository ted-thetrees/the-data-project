"use client";

import { useEffect, useState, useTransition } from "react";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";

interface EditableLinkProps {
  value: string | null | undefined;
  onSave: (v: string | null) => void | Promise<void>;
  placeholder?: string;
}

function normalize(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function EditableLink({ value, onSave, placeholder = "Add link" }: EditableLinkProps) {
  const [draft, setDraft] = useState(value ?? "");
  const [focused, setFocused] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setDraft(value ?? ""), [value]);

  function commit() {
    const next = normalize(draft);
    const previous = (value ?? "").trim() || null;
    if (next !== previous) {
      startTransition(() => {
        onSave(next);
      });
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value ?? "");
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          color: "inherit",
          border: 0,
          padding: 0,
          font: "inherit",
          outline: "none",
          boxShadow: focused
            ? "0 0 0 2px color-mix(in srgb, var(--foreground) 60%, transparent)"
            : undefined,
          borderRadius: focused ? 2 : undefined,
          opacity: isPending ? 0.6 : 1,
        }}
      />
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open link in new tab"
          title={value}
          style={{
            color: "var(--link-color)",
            display: "inline-flex",
            flexShrink: 0,
          }}
        >
          <ExternalLinkIcon size={13} />
        </a>
      ) : null}
    </div>
  );
}
