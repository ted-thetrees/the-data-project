import type React from "react";

export interface ColConfig {
  key: string;
  label: string;
  type: "text" | "select" | "image" | "date" | "custom";
  width: number;
  options?: string[];
  fontWeight?: number;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface GroupableField {
  key: string;
  label: string;
}

export interface SavedView {
  name: string;
  sorting: { id: string; desc: boolean }[];
  grouping: string[];
  groupSortDirs: ("asc" | "desc")[];
  columnVisibility: Record<string, boolean>;
  columnOrder?: string[];
  globalFilter: string;
}
