"use client";

import { useRef } from "react";
import {
  RovingTabIndexProvider,
  useRovingTabIndex,
  useFocusEffect,
} from "react-roving-tabindex";

export { RovingTabIndexProvider };

export function GridCellNav({
  rowIndex,
  disabled,
  children,
  className,
  style,
}: {
  rowIndex: number;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tabIndex, focused, handleKeyDown, handleClick] = useRovingTabIndex(
    ref as React.RefObject<Element>,
    disabled ?? false,
    rowIndex
  );
  useFocusEffect(focused, ref as React.RefObject<HTMLElement>);

  return (
    <div
      ref={ref}
      role="gridcell"
      tabIndex={tabIndex}
      onKeyDown={(e) => {
        handleKeyDown(e);
        if (e.key === "Enter" && !e.defaultPrevented) {
          const target = ref.current?.querySelector<HTMLElement>(
            ".gt-editable, .gt-picklist, input, select"
          );
          if (target) target.click();
        }
        // Start editing on printable key press (text cells only)
        if (
          !e.defaultPrevented &&
          e.key.length === 1 &&
          !e.ctrlKey && !e.metaKey && !e.altKey
        ) {
          const editable = ref.current?.querySelector<HTMLElement>(".gt-editable");
          if (editable) {
            editable.click();
            // After React re-renders, the input will exist — type the key into it
            requestAnimationFrame(() => {
              const input = ref.current?.querySelector<HTMLInputElement>("input.gt-input");
              if (input) {
                input.value = e.key;
                // Move cursor to end
                input.setSelectionRange(e.key.length, e.key.length);
              }
            });
          }
        }
      }}
      onMouseDown={() => {
        // Focus the gridcell on mousedown, before child click handlers fire
        ref.current?.focus();
      }}
      onClick={handleClick}
      className={className}
      style={{
        ...style,
        outline: focused ? `var(--focus-ring-width) solid var(--focus-ring-color)` : undefined,
        outlineOffset: focused ? "var(--focus-ring-offset)" : undefined,
      }}
    >
      {children}
    </div>
  );
}
