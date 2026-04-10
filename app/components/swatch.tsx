import { cn } from "@/lib/utils";

interface SwatchProps {
  color: string;
  size?: "sm" | "md";
  className?: string;
}

export function Swatch({ color, size = "md", className }: SwatchProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm border border-border shrink-0",
        size === "sm" ? "w-4 h-4" : "w-5 h-5",
        className
      )}
      style={{ backgroundColor: color }}
    />
  );
}
