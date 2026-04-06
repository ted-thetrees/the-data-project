import chroma from "chroma-js";

/** Pick the best contrasting text color for a given background.
 *  Uses --contrast-light and --contrast-dark from theme. */
export function contrastText(bg: string): string {
  const lightText = getComputedStyle(document.documentElement).getPropertyValue("--contrast-light").trim() || "#faf9f6";
  const darkText = getComputedStyle(document.documentElement).getPropertyValue("--contrast-dark").trim() || "#4a4639";
  try {
    const lightContrast = chroma.contrast(bg, lightText);
    const darkContrast = chroma.contrast(bg, darkText);
    return darkContrast >= lightContrast ? darkText : lightText;
  } catch {
    return darkText;
  }
}

/** Get the CSS variable reference for a depth level (0–4). */
export function depthColor(depth: number): string {
  const clamped = Math.min(depth, 4);
  return `var(--depth-${clamped})`;
}

// JS constants kept in sync with theme.css for cases where JS needs a number.
export const ROW_HEIGHT = 48;
export const INDENT_PX = 40;
export const GAP_PX = 2;

export const dataGridStyles = `
  .gt-input {
    width: 100%; padding: 4px 8px; font-size: var(--font-size-base); font-family: var(--font-family);
    border: none; border-radius: 0;
    background: transparent; color: inherit; outline: none;
    box-shadow: none;
  }
  .gt-picklist {
    display: flex; align-items: center; cursor: pointer;
    padding: 2px 4px; margin: -2px -4px; border-radius: var(--radius-sm);
    font-size: var(--cell-font-size); font-family: var(--font-family); width: 100%;
  }
  .gt-picklist:hover { background: var(--hover-overlay); }
  .gt-picklist-dropdown {
    position: absolute; top: 100%; left: -12px; right: -12px; z-index: 50;
    margin-top: 4px; padding: 4px 0;
    background: var(--dropdown-bg); border: var(--border-width) solid var(--dropdown-border);
    border-radius: var(--dropdown-radius); box-shadow: var(--dropdown-shadow);
    max-height: var(--dropdown-max-height); overflow-y: auto;
  }
  .gt-picklist-option {
    padding: 6px 12px; font-size: var(--font-size-sm); cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    transition: background var(--transition-fast);
  }
  .gt-picklist-option:hover { background: var(--accent); }
  .gt-picklist-active { font-weight: var(--font-weight-semibold); color: var(--primary); }
  .gt-editable { cursor: text; padding: 2px 4px; margin: -2px -4px; border-radius: var(--radius-sm); word-break: break-word; }
  .gt-editable:hover { background: var(--hover-overlay); }
  .gt-empty { color: var(--empty-color); opacity: var(--empty-opacity); }
  .gt-pending { opacity: var(--pending-opacity); }
  .gt-cell { padding: var(--cell-padding-y) var(--cell-padding-x); font-size: var(--cell-font-size); display: flex; align-items: center; min-height: var(--cell-min-height); }
  .gt-toolbar-btn {
    font-family: var(--font-family); font-size: var(--toolbar-font-size); padding: var(--toolbar-btn-padding-y) var(--toolbar-btn-padding-x);
    border: var(--border-width) solid var(--toolbar-border); border-radius: var(--toolbar-btn-radius);
    background: var(--background); color: var(--foreground); cursor: pointer;
    transition: background var(--transition-fast);
  }
  .gt-toolbar-btn:hover { background: var(--accent); }
  .gt-toolbar-select {
    font-size: var(--toolbar-font-size); font-family: var(--font-family); padding: var(--toolbar-btn-padding-y) 6px;
    border: var(--border-width) solid var(--toolbar-border); border-radius: var(--toolbar-btn-radius);
    background: var(--background); color: var(--foreground); cursor: pointer; outline: none;
  }
`;
