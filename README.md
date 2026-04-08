# The Data Project

A unified system for managing Ted's structured data — project management, people/CRM, inbox capture, and more.

**Live at**: [data.ifnotfor.com](https://data.ifnotfor.com)

## Versions

### [v002](v002/) — Current (Supabase + Coda + n8n)

Supabase is the single source of truth. Coda provides visual editing with bidirectional sync via n8n webhooks. Projects are created by voice dictation through Claude Code. See [Supa-Coda Tango](v002/docs/SUPA-CODA-TANGO.md) for the sync architecture.

### [v001](v001/) — Retired (Teable + Baserow + Custom UI)

Used Teable (then Baserow) as the data management layer with a custom Next.js frontend featuring 5 iterations of a project tree view. The Next.js app code in `app/` is still deployed for People and Inbox views.
