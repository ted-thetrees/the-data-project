"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PaletteForPicker = {
  id: string;
  name: string;
  colors: (string | null)[];
};

interface EditableColorCellProps {
  source: string;
  recordId: string;
  color: string;
  palettes: PaletteForPicker[];
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function EditableColorCell({
  source,
  recordId,
  color,
  palettes,
}: EditableColorCellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(color);
  const [hexInput, setHexInput] = useState(color);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function save(next: string) {
    const normalized = next.trim().toLowerCase();
    if (!HEX_RE.test(normalized)) {
      setError("Invalid hex");
      return;
    }
    setError(null);
    const previous = current;
    setCurrent(normalized);
    setHexInput(normalized);
    try {
      const res = await fetch("/api/pick-list-colors", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, id: recordId, color: normalized }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      startTransition(() => {
        router.refresh();
      });
      setOpen(false);
    } catch (e) {
      setCurrent(previous);
      setHexInput(previous);
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-block w-5 h-5 rounded-sm border border-border shrink-0 cursor-pointer align-middle",
          pending && "opacity-50"
        )}
        style={{ backgroundColor: current }}
        aria-label="Change color"
      />
      <PopoverContent align="start" className="w-[520px] gap-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-6 h-6 rounded-sm border border-border"
            style={{ backgroundColor: HEX_RE.test(hexInput) ? hexInput : "#fff" }}
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => {
              setHexInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") save(hexInput);
            }}
            placeholder="#rrggbb"
            className="flex-1 border border-border rounded-sm px-2 py-1 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => save(hexInput)}
            className="text-xs px-2 py-1 rounded-sm bg-foreground text-background"
          >
            Set
          </button>
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
          {palettes.length === 0 && (
            <div className="text-xs text-muted-foreground">No palettes yet.</div>
          )}
          {palettes.map((p) => (
            <div key={p.id}>
              <div className="text-[11px] text-muted-foreground mb-1">{p.name}</div>
              <div className="flex gap-[2px] flex-wrap">
                {p.colors.map((hex, i) =>
                  hex ? (
                    <button
                      key={i}
                      type="button"
                      onClick={() => save(hex)}
                      title={hex}
                      className="w-6 h-6 rounded-sm border border-border hover:ring-2 hover:ring-foreground/30"
                      style={{ backgroundColor: hex }}
                    />
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
