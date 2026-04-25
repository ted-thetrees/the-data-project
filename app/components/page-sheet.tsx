"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Subtitle } from "@/components/subtitle";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";

/**
 * The page-level right-side drawer used by grid pages.
 *
 * Renders a fixed hamburger button (pinned via --sheet-trigger-* tokens)
 * that opens a Sheet containing the page title, record count, optional
 * subtitle, and any children (typically ViewSwitcher + GroupByPicker).
 *
 * All visual aspects — width, padding, gap, colors, trigger position —
 * are theme-driven via CSS variables defined in theme.css. To restyle
 * every page that uses PageSheet, change those tokens.
 */
export function PageSheet({
  title,
  count,
  subtitle,
  children,
}: {
  title: string;
  count?: number;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="fixed z-40 bg-background border"
            style={{
              top: "var(--sheet-trigger-top)",
              right: "var(--sheet-trigger-right)",
            }}
            aria-label="Open menu"
            title="Menu"
          />
        }
      >
        <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
      </SheetTrigger>
      <SheetContent side="right">
        <div>
          <SheetTitle className="text-[length:var(--title-font-size)] leading-[var(--title-line-height)] font-[number:var(--title-font-weight)] tracking-[var(--letter-spacing-tight)]">
            {title}
          </SheetTitle>
          {count != null && (
            <p className="text-[color:var(--record-count-color)] text-[length:var(--record-count-font-size)] mt-1">
              {count.toLocaleString()} records
            </p>
          )}
        </div>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
        {children}
      </SheetContent>
    </Sheet>
  );
}
