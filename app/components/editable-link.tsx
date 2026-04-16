"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Empty } from "@/components/empty";

interface EditableLinkProps {
  value: string | null | undefined;
  onSave: (v: string | null) => void | Promise<void>;
  placeholder?: string;
}

function displayText(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export function EditableLink({ value, onSave, placeholder }: EditableLinkProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [focused, setFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value ?? ""), [value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const next = draft.trim();
    const normalized = next === "" ? null : next;
    const previous = (value ?? "").trim() || null;
    if (normalized !== previous) {
      startTransition(() => {
        onSave(normalized);
      });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
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
          if (e.key === "Enter") {
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
        autoFocus
        style={{
          background: "transparent",
          color: "inherit",
          border: 0,
          padding: 0,
          font: "inherit",
          width: "100%",
          outline: "none",
          boxShadow: focused
            ? "0 0 0 2px color-mix(in srgb, var(--foreground) 60%, transparent)"
            : undefined,
          borderRadius: focused ? 2 : undefined,
          opacity: isPending ? 0.6 : 1,
        }}
      />
    );
  }

  if (!value) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="block w-full cursor-text text-left"
        style={{ background: "transparent", border: 0, padding: 0, font: "inherit" }}
      >
        <Empty />
      </button>
    );
  }

  return (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      title={`${value} — double-click to edit`}
      onDoubleClick={(e) => {
        e.preventDefault();
        setEditing(true);
      }}
      className="themed-link block truncate"
    >
      {displayText(value)}
    </a>
  );
}
