import React from "react";

/**
 * Page subtitle — sits below the PageShell title. Uses --muted-foreground
 * and --font-size-sm; no negative margins so it composes cleanly inside
 * any wrapper.
 */
export function Subtitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-muted-foreground mb-6 ${className}`}
      style={{ fontSize: "var(--font-size-sm)" }}
    >
      {children}
    </p>
  );
}
