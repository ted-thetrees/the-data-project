# The Data Project

A unified system for managing Ted's structured data — project management, people/CRM, inbox capture, and more.

**Live at**: [data.ifnotfor.com](https://data.ifnotfor.com)

## Pages & Navigation

The app runs as a Unite Pro SSB (`/Applications/Data.app`) with a collapsible sidebar and keyboard shortcuts.

| # | Page | Path | Shortcut |
|---|------|------|----------|
| 1 | Inbox | `/inbox` | `Cmd+1` |
| 2 | Talent | `/talent` | `Cmd+2` |
| 3 | DAG | `/dag-v002` | `Cmd+3` |
| 4 | New Project | `/new-project` | `Cmd+4` |

### Raycast Scripts

Raycast script commands live in `~/Library/CloudStorage/Dropbox/Raycast Scripts/data-*.sh`. Each activates Data.app and sends the corresponding `Cmd+N` shortcut to navigate without opening new tabs. The keyboard shortcuts are handled by `components/nav-shortcuts.tsx` in the Next.js app.

### Sidebar

The sidebar (`components/app-sidebar.tsx`) defaults to collapsed. Toggle with the hamburger icon or `Cmd+B`.

## Versions

### [v002](v002/) — Current (Supabase + Coda + n8n)

Supabase is the single source of truth. Coda provides visual editing with bidirectional sync via n8n webhooks. Projects are created by voice dictation through Claude Code. See [Supa-Coda Tango](v002/docs/SUPA-CODA-TANGO.md) for the sync architecture.

### [v001](v001/) — Retired (Teable + Baserow + Custom UI)

Used Teable (then Baserow) as the data management layer with a custom Next.js frontend featuring 5 iterations of a project tree view. The Next.js app code in `app/` is still deployed for People and Inbox views.
