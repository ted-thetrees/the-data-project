export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "select" | "image";
  options?: string[];
  width: number;
  fontWeight?: number;
}

export interface GroupableField {
  key: string;
  label: string;
}

export interface TableRow {
  id: string;
  [key: string]: string | null;
}
