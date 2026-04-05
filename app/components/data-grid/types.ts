export interface ColConfig {
  key: string;
  label: string;
  type: "text" | "select" | "image" | "date";
  width: number;
  options?: string[];
  fontWeight?: number;
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
  globalFilter: string;
}
