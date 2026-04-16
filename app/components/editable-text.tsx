"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

interface EditableTextProps {
  value: string;
  onSave: (v: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
}

export function EditableText({ value, onSave, placeholder, className }: EditableTextProps) {
  const [v, setV] = useState(value);
  const [focused, setFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  useEffect(() => setV(value), [value]);
  return (
    <input
      type="text"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        if (v !== value) {
          startTransition(() => {
            onSave(v);
          });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setV(value);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={className}
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

export function EditableTextWrap({ value, onSave, placeholder, className }: EditableTextProps) {
  const [v, setV] = useState(value);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setV(value), [value]);
  useLayoutEffect(() => {
    const ta = ref.current;
    if (ta) {
      ta.style.height = "0px";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [v]);
  return (
    <textarea
      ref={ref}
      value={v}
      placeholder={placeholder}
      rows={1}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) {
          startTransition(() => {
            onSave(v);
          });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.currentTarget as HTMLTextAreaElement).blur();
        }
        if (e.key === "Escape") {
          setV(value);
          (e.currentTarget as HTMLTextAreaElement).blur();
        }
      }}
      className={className}
      style={{
        background: "transparent",
        color: "inherit",
        border: 0,
        padding: 0,
        font: "inherit",
        width: "100%",
        outline: "none",
        resize: "none",
        opacity: isPending ? 0.6 : 1,
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        lineHeight: "1.4",
        display: "block",
      }}
    />
  );
}

interface EditableNumberProps {
  value: number;
  onSave: (v: number) => void | Promise<void>;
  className?: string;
}

export function EditableNumber({ value, onSave, className }: EditableNumberProps) {
  const [v, setV] = useState(String(value));
  const [isPending, startTransition] = useTransition();
  useEffect(() => setV(String(value)), [value]);
  return (
    <input
      type="number"
      value={v}
      min={0}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Number(v);
        if (Number.isFinite(n) && n !== value) {
          startTransition(() => {
            onSave(Math.round(n));
          });
        } else if (!Number.isFinite(n)) {
          setV(String(value));
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setV(String(value));
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={className}
      style={{
        background: "transparent",
        color: "inherit",
        border: 0,
        padding: 0,
        font: "inherit",
        width: "100%",
        outline: "none",
        opacity: isPending ? 0.6 : 1,
        textAlign: "right",
        appearance: "textfield",
        MozAppearance: "textfield",
      }}
    />
  );
}
