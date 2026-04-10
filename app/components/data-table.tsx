import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <table className="w-full text-[length:var(--cell-font-size)]">
        <thead>
          <tr
            className="text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)] uppercase tracking-[var(--header-letter-spacing)] bg-[color:var(--header-bg)] text-[color:var(--header-color)]"
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-[var(--header-padding-x)] py-[var(--header-padding-y)] font-[number:var(--header-font-weight)]",
                  col.align === "center"
                    ? "text-center"
                    : col.align === "right"
                      ? "text-right"
                      : "text-left",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-t border-border hover:bg-[color:var(--hover-overlay)] transition-colors duration-[var(--transition-fast)]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)]",
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                        ? "text-right"
                        : "text-left",
                    col.className
                  )}
                >
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
