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
    ref,
    disabled ?? false,
    rowIndex
  );
  useFocusEffect(focused, ref);

  return (
    <div
      ref={ref}
      role="gridcell"
      tabIndex={tabIndex}
      onKeyDown={(e) => {
        // Let the roving tabindex handle arrow keys
        handleKeyDown(e);
        // Enter to activate the cell (click the first interactive child)
        if (e.key === "Enter" && !e.defaultPrevented) {
          const target = ref.current?.querySelector<HTMLElement>(
            ".gt-editable, .gt-picklist, input, select"
          );
          if (target) target.click();
        }
      }}
      onClick={handleClick}
      className={className}
      style={{
        ...style,
        outline: focused ? "2px solid var(--ring)" : undefined,
        outlineOffset: focused ? -2 : undefined,
      }}
    >
      {children}
    </div>
  );
}
