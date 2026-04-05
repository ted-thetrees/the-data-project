import chroma from "chroma-js";

const LIGHT_TEXT = "#faf9f6";
const DARK_TEXT = "#4a4639";

/** Pick the best contrasting text color (near-white or near-black) for a given background. */
export function contrastText(bg: string): string {
  try {
    const lightContrast = chroma.contrast(bg, LIGHT_TEXT);
    const darkContrast = chroma.contrast(bg, DARK_TEXT);
    return darkContrast >= lightContrast ? DARK_TEXT : LIGHT_TEXT;
  } catch {
    return DARK_TEXT;
  }
}

export const DEFAULT_CELL_BG = "#F3F0E9";

export const DEPTH_COLORS = [
  "#F3F0E9",
  "#EDE9E1",
  "#E7E3DA",
  "#E1DDD4",
  "#DBD7CE",
];

export const INDENT_PX = 40;
export const GAP_PX = 2;

export const dataGridStyles = `
  .gt-input {
    width: 100%; padding: 4px 8px; font-size: 14px; font-family: inherit;
    border: 1px solid var(--ring); border-radius: 6px;
    background: var(--background); color: var(--foreground); outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
  }
  .gt-picklist {
    display: flex; align-items: center; cursor: pointer;
    padding: 2px 4px; margin: -2px -4px; border-radius: 4px;
    font-size: 14px; font-family: inherit; width: 100%;
  }
  .gt-picklist:hover { background: rgba(0,0,0,0.04); }
  .gt-picklist-dropdown {
    position: absolute; top: 100%; left: -12px; right: -12px; z-index: 50;
    margin-top: 4px; padding: 4px 0;
    background: var(--background); border: 1px solid var(--border);
    border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    max-height: 240px; overflow-y: auto;
  }
  .gt-picklist-option {
    padding: 6px 12px; font-size: 13px; cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .gt-picklist-option:hover { background: var(--accent); }
  .gt-picklist-active { font-weight: 600; color: var(--primary); }
  .gt-editable { cursor: text; padding: 2px 4px; margin: -2px -4px; border-radius: 4px; word-break: break-word; }
  .gt-editable:hover { background: rgba(0,0,0,0.04); }
  .gt-empty { color: var(--muted-foreground); opacity: 0.4; }
  .gt-pending { opacity: 0.5; }
  .gt-cell { padding: 8px 12px; font-size: 14px; display: flex; align-items: center; min-height: 36px; }
  .gt-toolbar-btn {
    font-family: inherit; font-size: 12px; padding: 3px 10px;
    border: 1px solid var(--border); border-radius: 6px;
    background: var(--background); color: var(--foreground); cursor: pointer;
  }
  .gt-toolbar-btn:hover { background: var(--accent); }
  .gt-toolbar-select {
    font-size: 12px; font-family: inherit; padding: 3px 6px;
    border: 1px solid var(--border); border-radius: 6px;
    background: var(--background); color: var(--foreground); cursor: pointer; outline: none;
  }
`;
