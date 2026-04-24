"use client";

import { useEffect, useLayoutEffect, useState, useTransition } from "react";
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
// Simple case-insensitive substring filter. We disable cmdk's built-in
// filter (shouldFilter={false}) because it ignores the keywords prop and
// only matches against the item value (which is a numeric id).
function matchesSearch(name: string, search: string): boolean {
  return !search || name.toLowerCase().includes(search.toLowerCase());
}

// Focus the cmdk input after the popover portal mounts.
// Base UI popover doesn't auto-focus portal content, so without this
// keystrokes go to the trigger button instead of the search field.
//
// The portal also triggers a document-scroll jump: cmdk calls
// scrollIntoView({ block: 'nearest' }) on the initially-selected command
// item as it syncs state. Because the popup is portaled, the nearest
// scroll ancestor that scrollIntoView finds is the document itself —
// and the popup's initial document-space position is near (0, 0), so
// the page scrolls to the top. We snapshot scroll before open and
// undo any shift across the next few frames.
function useFocusCmdkInput(open: boolean) {
  useLayoutEffect(() => {
    if (!open) return;
    // Suppress scrollIntoView calls (cmdk and friends call this when the
    // popup mounts, which jumps the page to the popup's portal location —
    // disastrous when the trigger is inside a virtualized scroll region:
    // the page scrolls, the virtualizer re-renders, and the trigger
    // disappears from the DOM mid-flight).
    const proto = Element.prototype as Element & {
      scrollIntoView: (...args: unknown[]) => void;
    };
    const original = proto.scrollIntoView;
    proto.scrollIntoView = function () {
      /* no-op while pill popover is open */
    };
    const raf1 = requestAnimationFrame(() => {
      document
        .querySelector<HTMLInputElement>('[data-slot="command-input"]')
        ?.focus({ preventScroll: true });
    });
    const restoreSIV = setTimeout(() => {
      proto.scrollIntoView = original;
    }, 200);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(restoreSIV);
      proto.scrollIntoView = original;
    };
  }, [open]);
}

function captureScrollOnPointerDown() {
  // No-op kept for compatibility with existing trigger props; the real fix
  // is now to neutralize scrollIntoView while the popup is open.
}

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
  useFocusCmdkInput(open);
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
        onPointerDown={captureScrollOnPointerDown}
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
        <Command className="!rounded-md" loop shouldFilter={false}>
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
            <CommandGroup>
              {options
                .filter((opt) => matchesSearch(opt.name, trimmed))
                .map((opt) => {
                  const isSel = selected.has(opt.id);
                  return (
                    <CommandItem
                      key={opt.id}
                      value={opt.id}
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
                  value="__create__"
                  onSelect={handleCreate}
                >
                  <span className="text-muted-foreground">Create</span>
                  <span className="ml-1">&ldquo;{trimmed}&rdquo;</span>
                </CommandItem>
              )}
            </CommandGroup>
            {!showCreate &&
              trimmed &&
              options.every((o) => !matchesSearch(o.name, trimmed)) && (
                <CommandEmpty>No matches.</CommandEmpty>
              )}
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
  useFocusCmdkInput(open);
  // Optimistic local override — display the picked value the instant the
  // user selects, without waiting for the server action + revalidate +
  // re-fetch + re-render round-trip. Server-confirmed value supersedes
  // when the prop updates.
  const [optimistic, setOptimistic] = useState<string | null>(null);
  useEffect(() => {
    // Server has caught up with our optimistic guess — drop the override.
    if (optimistic != null && value === optimistic) setOptimistic(null);
  }, [value, optimistic]);
  const displayedValue = optimistic ?? value;
  const current = options.find((o) => o.id === displayedValue);
  const bg = current?.color || DEFAULT_COLOR;
  const fg = contrastTextColor(current?.color ?? null);

  const trimmed = search.trim();
  const exact = trimmed
    ? options.find((o) => o.name.toLowerCase() === trimmed.toLowerCase())
    : null;
  const showCreate = !!onCreate && trimmed.length > 0 && !exact;

  const handleSelect = (id: string) => {
    setOptimistic(id);
    startTransition(() => onSave(id));
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    setOptimistic("");
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
        onPointerDown={captureScrollOnPointerDown}
      >
        {current?.name ?? "—"}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[260px] p-0 !rounded-md"
      >
        <Command className="!rounded-md" loop shouldFilter={false}>
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
            <CommandGroup>
              {options
                .filter((opt) => matchesSearch(opt.name, trimmed))
                .map((opt) => {
                  const obg = opt.color || DEFAULT_COLOR;
                  const ofg = contrastTextColor(opt.color ?? null);
                  const isSel = opt.id === value;
                  return (
                    <CommandItem
                      key={opt.id}
                      value={opt.id}
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
                  value="__create__"
                  onSelect={handleCreate}
                >
                  <span className="text-muted-foreground">Create</span>
                  <span className="ml-1">&ldquo;{trimmed}&rdquo;</span>
                </CommandItem>
              )}
            </CommandGroup>
            {!showCreate &&
              trimmed &&
              options.every((o) => !matchesSearch(o.name, trimmed)) && (
                <CommandEmpty>No matches.</CommandEmpty>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
