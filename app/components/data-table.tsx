import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: number;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
  fixedLayout?: boolean;
  ratingColumn?: string;
  ratingColors?: Record<string, string>;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  className,
  fixedLayout,
  ratingColumn,
  ratingColors,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table
        className="text-[length:var(--cell-font-size)] [&_td]:align-top"
        style={{
          tableLayout: fixedLayout ? "fixed" : undefined,
          borderCollapse: "separate",
          borderSpacing: "var(--row-gap)",
        }}
      >
        {columns.some((c) => c.width) && (
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={col.width ? { width: col.width } : undefined} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-[var(--header-padding-x)] py-[var(--header-padding-y)]",
                  "text-[length:var(--header-font-size)] font-[number:var(--header-font-weight)]",
                  "bg-[color:var(--header-bg)] text-[color:var(--header-color)]",
                  col.align === "center"
                    ? "text-center"
                    : col.align === "right"
                      ? "text-right"
                      : "text-left",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const record = row as Record<string, unknown>;
            return (
              <tr key={rowKey(row)}>
                {columns.map((col) => {
                  const isRating = ratingColumn && col.key === ratingColumn;
                  const ratingValue = isRating ? String(record[col.key] ?? "") : "";
                  const ratingBg = isRating && ratingColors ? ratingColors[ratingValue] : undefined;

                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)]",
                        !ratingBg && "bg-[color:var(--cell-bg)]",
                        col.align === "center"
                          ? "text-center"
                          : col.align === "right"
                            ? "text-right"
                            : "text-left",
                        col.className,
                      )}
                      style={ratingBg ? { backgroundColor: ratingBg, padding: "6px 12px" } : undefined}
                    >
                      {col.render
                        ? col.render(row)
                        : String(record[col.key] ?? "")}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
