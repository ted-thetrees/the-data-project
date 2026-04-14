"use client";

import { useState, useTransition } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { contrastTextColor } from "@/lib/contrast";

export const PILL_CLASS =
  "inline-flex items-center whitespace-nowrap";

const PILL_STYLE: React.CSSProperties = {
  borderRadius: "var(--pill-radius)",
  padding: "var(--pill-padding-y) var(--pill-padding-x)",
  fontSize: "var(--pill-font-size)",
  fontWeight: "var(--pill-font-weight)" as React.CSSProperties["fontWeight"],
};

const DEFAULT_COLOR = "var(--status-default)";

export function Pill({
  color,
  children,
}: {
  color: string | null | undefined;
  children: React.ReactNode;
}) {
  const bg = color || DEFAULT_COLOR;
  const fg = contrastTextColor(color);
  return (
    <span
      className={PILL_CLASS}
      style={{
        ...PILL_STYLE,
        backgroundColor: bg,
        color: fg,
        width: "fit-content",
      }}
    >
      {children}
    </span>
  );
}

export type PillOption = {
  id: string;
  name: string;
  color: string | null;
};

const TAG_GEOMETRY: React.CSSProperties = {
  fontSize: "var(--tag-font-size)",
  padding: "var(--tag-padding-y) var(--tag-padding-x)",
  borderRadius: "var(--tag-radius)",
};

const DEFAULT_TAG_BG = "var(--tag-bg)";
const DEFAULT_TAG_FG = "var(--tag-text)";

function tagColors(color: string | null | undefined): {
  backgroundColor: string;
  color: string;
} {
  if (!color) {
    return { backgroundColor: DEFAULT_TAG_BG, color: DEFAULT_TAG_FG };
  }
  return { backgroundColor: color, color: contrastTextColor(color) };
}

/**
 * Multi-value variant of PillSelect — renders the current selection as a
 * flex-wrap of tag chips followed by a "+" affordance. Clicking opens a
 * popover that lists every option; clicking an option toggles membership.
 * The popover stays open so the user can toggle several in one session.
 *
 * Each option's `color` drives the chip background (with contrast-computed
 * text), matching PillSelect. Options with no color fall back to the
 * --tag-bg / --tag-text theme tokens.
 *
 * Follows the multi-value grouping contract in lib/table-grouping.ts: the
 * callbacks receive option ids, not display_ids. The caller is responsible
 * for mutating the canonical record (typically keyed off `row.record_id`).
 */
export function MultiPillSelect({
  value,
  options,
  onAdd,
  onRemove,
}: {
  value: string[];
  options: PillOption[];
  onAdd: (id: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selected = new Set(value);
  const selectedOptions = value
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is PillOption => o != null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex flex-wrap gap-1 cursor-pointer items-center text-left"
        style={{ opacity: isPending ? 0.6 : 1 }}
        title="Edit tags"
      >
        {selectedOptions.map((opt) => (
          <span
            key={opt.id}
            className="inline-block"
            style={{ ...TAG_GEOMETRY, ...tagColors(opt.color) }}
          >
            {opt.name}
          </span>
        ))}
        <span
          className="inline-flex items-center justify-center text-muted-foreground"
          style={{
            ...TAG_GEOMETRY,
            backgroundColor: "transparent",
            color: DEFAULT_TAG_FG,
            opacity: 0.55,
          }}
          aria-label="Add tag"
        >
          +
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto min-w-[160px] gap-1 p-2 !rounded-none"
      >
        <div className="flex flex-col items-start gap-1.5">
          {options.map((opt) => {
            const isSelected = selected.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    if (isSelected) onRemove(opt.id);
                    else onAdd(opt.id);
                  });
                }}
                className={`inline-block cursor-pointer ring-offset-1 ${
                  isSelected ? "ring-2 ring-foreground/40" : ""
                }`}
                style={{ ...TAG_GEOMETRY, ...tagColors(opt.color) }}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PillSelect({
  value,
  options,
  onSave,
}: {
  value: string;
  options: PillOption[];
  onSave: (v: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const current = options.find((o) => o.id === value);
  const bg = current?.color || DEFAULT_COLOR;
  const fg = contrastTextColor(current?.color ?? null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`${PILL_CLASS} cursor-pointer`}
        style={{
          ...PILL_STYLE,
          backgroundColor: bg,
          color: fg,
          width: "fit-content",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {current?.name ?? "—"}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto min-w-[160px] gap-1 p-2 !rounded-none"
      >
        <div className="flex flex-col items-start gap-1.5">
          {options.map((opt) => {
            const isSelected = opt.id === value;
            const obg = opt.color || DEFAULT_COLOR;
            const ofg = contrastTextColor(opt.color ?? null);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    onSave(opt.id);
                  });
                  setOpen(false);
                }}
                className={`${PILL_CLASS} cursor-pointer ring-offset-1 ${
                  isSelected ? "ring-2 ring-foreground/40" : ""
                }`}
                style={{
                  ...PILL_STYLE,
                  backgroundColor: obg,
                  color: ofg,
                }}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
