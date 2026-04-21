import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  /** Distinct record count (the canonical record total, ignoring expansion). */
  count?: number;
  /**
   * Visible row count after multi-value tag expansion. When set and different
   * from `count`, the header renders "N records · M rows in view".
   */
  displayRowCount?: number;
  maxWidth?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  count,
  displayRowCount,
  maxWidth = "max-w-4xl",
  children,
  className,
}: PageShellProps) {
  const classes = [
    "px-[var(--page-padding-x)] py-[var(--page-padding-y)]",
    maxWidth,
    maxWidth ? "mx-auto" : "",
    className,
  ].filter(Boolean).join(" ");

  const showExpanded =
    count != null &&
    displayRowCount != null &&
    displayRowCount !== count;

  return (
    <div className={classes}>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-[length:var(--title-font-size)] leading-[var(--title-line-height)] font-[number:var(--title-font-weight)] tracking-[var(--letter-spacing-tight)]">
          {title}
        </h1>
        {count != null && (
          <span className="text-[length:var(--record-count-font-size)] text-[color:var(--record-count-color)]">
            {count.toLocaleString()} records
            {showExpanded && ` · ${displayRowCount!.toLocaleString()} rows in view`}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
