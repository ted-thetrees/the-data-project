export const DEPTH_COLORS = [
  "#f7f0ea",  // warm cream
  "#f0f2eb",  // sage
  "#f1eff0",  // lavender
  "#f6f0eb",  // peach
  "#f0f2f1",  // sky
];

export const INDENT_PX = 40;
export const GAP_PX = 2;

export const tableStyles = `
  .gt-input {
    width: 100%;
    padding: 4px 8px;
    font-size: 14px;
    font-family: inherit;
    border: 1px solid var(--ring);
    border-radius: 6px;
    background: var(--background);
    color: var(--foreground);
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
  }
  .gt-select {
    font-size: 12px;
    font-family: inherit;
    padding: 3px 6px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--background);
    color: var(--foreground);
    cursor: pointer;
    outline: none;
    width: 100%;
  }
  .gt-select:focus {
    border-color: var(--ring);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
  }
  .gt-editable {
    cursor: text;
    padding: 2px 4px;
    margin: -2px -4px;
    border-radius: 4px;
    word-break: break-word;
  }
  .gt-editable:hover {
    background: rgba(0,0,0,0.04);
  }
  .gt-empty {
    color: var(--muted-foreground);
    opacity: 0.4;
  }
  .gt-pending {
    opacity: 0.5;
  }
  .gt-cell {
    padding: 8px 12px;
    font-size: 14px;
    display: flex;
    align-items: center;
    min-height: 36px;
  }
  .gt-toolbar-btn {
    font-family: inherit;
    font-size: 12px;
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--background);
    color: var(--foreground);
    cursor: pointer;
  }
  .gt-toolbar-btn:hover {
    background: var(--accent);
  }
`;
