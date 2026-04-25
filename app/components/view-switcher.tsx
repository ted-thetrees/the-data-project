"use client";

import type { View } from "./table-views";

export function ViewSwitcher({
  views,
  activeViewId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  children,
}: {
  views: View[];
  activeViewId: string | null;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-4"
      style={{ fontSize: "var(--font-size-sm)" }}
    >
      <span className="text-muted-foreground">View:</span>
      <select
        value={activeViewId ?? ""}
        onChange={(e) => onSwitch(e.target.value)}
        className="themed-button"
      >
        {views.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <button onClick={onCreate} className="themed-button">
        + New
      </button>
      <button onClick={onRename} className="themed-button">
        Rename
      </button>
      <button
        onClick={onDelete}
        disabled={views.length <= 1}
        className="themed-button"
      >
        Delete
      </button>
      {children && (
        <span className="ml-auto text-muted-foreground">{children}</span>
      )}
    </div>
  );
}
