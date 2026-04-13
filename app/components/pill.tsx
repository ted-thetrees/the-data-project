"use client";

import { useState, useTransition } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { contrastTextColor } from "@/lib/contrast";

export const PILL_CLASS =
  "inline-flex items-center rounded-full px-2.5 py-0 text-[length:var(--cell-font-size)] font-medium whitespace-nowrap";

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
      style={{ backgroundColor: bg, color: fg, width: "fit-content" }}
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
                style={{ backgroundColor: obg, color: ofg }}
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
