import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  count?: number;
  maxWidth?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  count,
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

  return (
    <div className={classes}>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-[length:var(--title-font-size)] font-[number:var(--title-font-weight)] tracking-[var(--letter-spacing-tight)]">
          {title}
        </h1>
        {count != null && (
          <span className="text-[length:var(--record-count-font-size)] text-[color:var(--record-count-color)]">
            {count.toLocaleString()} records
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
