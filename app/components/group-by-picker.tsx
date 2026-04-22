"use client";

import { X } from "lucide-react";

export interface GroupByOption {
  key: string;
  label: string;
}

/**
 * Compact row-of-dropdowns for picking nested group-by fields. The first
 * dropdown sets the outermost group; subsequent dropdowns appear as the user
 * commits a level. Choose the empty option on any level to clear it (and all
 * deeper levels).
 */
export function GroupByPicker({
  available,
  groupBy,
  onChange,
}: {
  available: GroupByOption[];
  groupBy: string[];
  onChange: (keys: string[]) => void;
}) {
  const labelFor = (key: string) =>
    available.find((a) => a.key === key)?.label ?? key;

  const setLevel = (level: number, key: string) => {
    if (!key) {
      // clear this level and everything below it
      onChange(groupBy.slice(0, level));
      return;
    }
    const next = [...groupBy];
    next[level] = key;
    // drop duplicates that would re-use the same field at a deeper level
    const seen = new Set<string>();
    const deduped = next.filter((k) => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    onChange(deduped);
  };

  const remainingOptions = (level: number) =>
    available.filter(
      (a) => a.key === groupBy[level] || !groupBy.includes(a.key),
    );

  const slots = [...groupBy, ""]; // show one empty trailing slot for adding a level

  return (
    <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
      <span className="text-[color:var(--muted-foreground)]">Group by:</span>
      {slots.map((current, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && (
            <span className="text-[color:var(--muted-foreground)]">then</span>
          )}
          <select
            value={current}
            onChange={(e) => setLevel(i, e.target.value)}
            className="bg-[color:var(--cell-bg)] border border-[color:var(--border)] rounded px-2 py-0.5 text-sm"
            title={current ? `Grouped by ${labelFor(current)}` : "Pick a field to group by"}
          >
            <option value="">{i === 0 ? "— none —" : "— add level —"}</option>
            {remainingOptions(i).map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {groupBy.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="flex items-center gap-1 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          title="Clear grouping"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
