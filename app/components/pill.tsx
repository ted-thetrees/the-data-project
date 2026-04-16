"use client";

import { useState, useTransition } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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

// MultiPillSelect chips share the geometry of PillSelect (stadium-rounded,
// --cell-font-size) so the Areas column visually matches Category / Primary
// Talent / Rating in the same row. --tag-* would render a smaller,
// rectangular chip that looks out of place next to real pills.
function tagColors(color: string | null | undefined) {
  return {
    backgroundColor: color || DEFAULT_COLOR,
    color: contrastTextColor(color ?? null),
  };
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
// Sentinel value for the "Create '…'" item so it can never collide with a
// real option id. Keywords carry the search term so cmdk keeps it visible.
const CREATE_VALUE = "__pill_create__";

export function MultiPillSelect({
  value,
  options,
  onAdd,
  onRemove,
  onCreate,
}: {
  value: string[];
  options: PillOption[];
  onAdd: (id: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onCreate?: (name: string) => Promise<PillOption>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = new Set(value);
  const selectedOptions = value
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is PillOption => o != null);

  const trimmed = search.trim();
  const exact = trimmed
    ? options.find((o) => o.name.toLowerCase() === trimmed.toLowerCase())
    : null;
  const showCreate = !!onCreate && trimmed.length > 0 && !exact;

  const toggle = (opt: PillOption) => {
    startTransition(() => {
      if (selected.has(opt.id)) onRemove(opt.id);
      else onAdd(opt.id);
    });
    setSearch("");
  };

  const handleCreate = () => {
    if (!onCreate || !trimmed) return;
    startTransition(async () => {
      const newOpt = await onCreate(trimmed);
      await onAdd(newOpt.id);
    });
    setSearch("");
  };

  const removeLast = () => {
    if (value.length === 0) return;
    startTransition(() => onRemove(value[value.length - 1]));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger
        className="flex flex-wrap gap-1 cursor-pointer items-center text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-1"
        style={{ opacity: isPending ? 0.6 : 1 }}
        title="Edit tags"
      >
        {selectedOptions.map((opt) => (
          <span
            key={opt.id}
            className={PILL_CLASS}
            style={{ ...PILL_STYLE, ...tagColors(opt.color) }}
          >
            {opt.name}
          </span>
        ))}
        <span
          className={`${PILL_CLASS} text-muted-foreground`}
          style={{
            ...PILL_STYLE,
            backgroundColor: "transparent",
            color: "currentColor",
            opacity: 0.55,
          }}
          aria-label="Add tag"
        >
          +
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[260px] p-0 !rounded-md"
      >
        <Command className="!rounded-md" loop>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={onCreate ? "Search or create…" : "Search…"}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && search === "") {
                e.preventDefault();
                removeLast();
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>{showCreate ? null : "No matches."}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSel = selected.has(opt.id);
                return (
                  <CommandItem
                    key={opt.id}
                    value={opt.id}
                    keywords={[opt.name]}
                    onSelect={() => toggle(opt)}
                    data-checked={isSel || undefined}
                  >
                    <span
                      className={PILL_CLASS}
                      style={{ ...PILL_STYLE, ...tagColors(opt.color) }}
                    >
                      {opt.name}
                    </span>
                  </CommandItem>
                );
              })}
              {showCreate && (
                <CommandItem
                  value={CREATE_VALUE}
                  keywords={[trimmed]}
                  onSelect={handleCreate}
                >
                  <span className="text-muted-foreground">Create</span>
                  <span className="ml-1">&ldquo;{trimmed}&rdquo;</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function PillSelect({
  value,
  options,
  onSave,
  onCreate,
}: {
  value: string;
  options: PillOption[];
  onSave: (v: string) => void | Promise<void>;
  onCreate?: (name: string) => Promise<PillOption>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const current = options.find((o) => o.id === value);
  const bg = current?.color || DEFAULT_COLOR;
  const fg = contrastTextColor(current?.color ?? null);

  const trimmed = search.trim();
  const exact = trimmed
    ? options.find((o) => o.name.toLowerCase() === trimmed.toLowerCase())
    : null;
  const showCreate = !!onCreate && trimmed.length > 0 && !exact;

  const handleSelect = (id: string) => {
    startTransition(() => onSave(id));
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    startTransition(() => onSave(""));
    setOpen(false);
    setSearch("");
  };

  const handleCreate = () => {
    if (!onCreate || !trimmed) return;
    startTransition(async () => {
      const newOpt = await onCreate(trimmed);
      await onSave(newOpt.id);
    });
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger
        className={`${PILL_CLASS} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-1`}
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
        className="w-[260px] p-0 !rounded-md"
      >
        <Command className="!rounded-md" loop>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={onCreate ? "Search or create…" : "Search…"}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && search === "") {
                e.preventDefault();
                if (value) handleClear();
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>{showCreate ? null : "No matches."}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const obg = opt.color || DEFAULT_COLOR;
                const ofg = contrastTextColor(opt.color ?? null);
                const isSel = opt.id === value;
                return (
                  <CommandItem
                    key={opt.id}
                    value={opt.id}
                    keywords={[opt.name]}
                    onSelect={() => handleSelect(opt.id)}
                    data-checked={isSel || undefined}
                  >
                    <span
                      className={PILL_CLASS}
                      style={{
                        ...PILL_STYLE,
                        backgroundColor: obg,
                        color: ofg,
                      }}
                    >
                      {opt.name}
                    </span>
                  </CommandItem>
                );
              })}
              {showCreate && (
                <CommandItem
                  value={CREATE_VALUE}
                  keywords={[trimmed]}
                  onSelect={handleCreate}
                >
                  <span className="text-muted-foreground">Create</span>
                  <span className="ml-1">&ldquo;{trimmed}&rdquo;</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
