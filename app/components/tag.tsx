import React from "react";

/**
 * Neutral labeled chip — for non-status pill-like labels (area tags,
 * Yes badges, etc.). All geometry and color comes from --tag-* theme tokens.
 */
export function Tag({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`inline-block ${className}`}
      style={{
        backgroundColor: "var(--tag-bg)",
        color: "var(--tag-text)",
        fontSize: "var(--tag-font-size)",
        padding: "var(--tag-padding-y) var(--tag-padding-x)",
        borderRadius: "var(--tag-radius)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
