# The Data Project — v002

A unified system for managing Ted's structured data. Supabase is the single source of truth, Coda is the visual editing layer, and n8n orchestrates all sync between them.

## Architecture

```
Claude Code (voice dictation)
  |
  v
Supabase (Postgres) ---- source of truth
  |         ^
  |  n8n    |  n8n
  |  sync   |  sync
  v         |
Coda (visual editing) --- Master | Main View Table
  |
  v
Custom Pack ("n8n Webhook") --- outgoing HTTP
```

- **Supabase** — normalized Postgres database with UUID primary keys, status lookup tables, passphrase-based record identification, and trigger functions for sync
- **Coda** — spreadsheet UI for bulk editing, sorting, grouping, and visual project management
- **n8n** — workflow orchestrator on Hetzner (178.156.235.239) handling all webhook routing
- **Neo4j** — graph layer for person-to-person relationships, synced from Supabase
- **Next.js app** — custom views at data.ifnotfor.com (People v003, Inbox)

## What Changed from v001

| Aspect | v001 | v002 |
|--------|------|------|
| Data management UI | Teable (self-hosted), then Baserow | Coda (bidirectional sync) |
| Database writes | Teable REST API | Supabase directly (via Claude Code, RPC functions) |
| Database reads | Supabase Postgres (direct SQL) | Same |
| Project management UI | Custom Next.js tree views (5 iterations) | Coda table with automations |
| Sync | One-way (manual) | Bidirectional, automatic, with loop prevention |
| Record creation | Manual in Teable/Baserow UI | Voice dictation via Claude Code (`/new-project`) |

## Key Components

### Supabase Database (normalized)

| Table | Purpose |
|-------|---------|
| `uber_projects` | Top-level project groups (If Not For, Personal, etc.) |
| `projects` | Individual projects with status, tickle date, notes |
| `tasks` | Tasks under projects with status, order, result |
| `project_statuses` | Lookup: Active, Successful, Abandoned |
| `task_statuses` | Lookup: Tickled, Done, Abandoned |
| `people` | People directory |
| `inbox` | Captured items (URLs, text, notes) |
| `passphrases` | 3-word PGP passphrases linked to records |

### Bidirectional Sync (Supa-Coda Tango)

Full documentation: [docs/SUPA-CODA-TANGO.md](docs/SUPA-CODA-TANGO.md)

The sync system has two one-way pipes connected by loop prevention:

1. **Supabase to Coda** — Postgres BEFORE triggers detect changes, POST to n8n, which upserts/deletes rows in Coda
2. **Coda to Supabase** — Coda automation fires on row edits, calls a custom Pack that POSTs to n8n, which calls a Supabase RPC function
3. **Loop prevention** — a `_coda_sync` boolean flag on each row, consumed atomically by the trigger

### Voice Dictation Workflow

Ted creates projects by speaking to Claude Code:

```
/new-project
project: Build the thing
task: Research options
tickle: friday
uber: If Not For
```

Claude parses this, creates the project and task in Supabase, generates PGP passphrases for both, and the sync automatically pushes them to Coda.

### Passphrase System

Every record gets a unique 3-word passphrase (e.g., "spyglass aftermath waffle") using PGP word lists. The pattern is even-word + odd-word + even-word (2-syllable + 3-syllable + 2-syllable). Passphrases are voice-friendly and used for quick record lookup via Claude Code.

## Infrastructure

| Service | Location | URL |
|---------|----------|-----|
| Next.js app | Hetzner (178.156.235.239) | data.ifnotfor.com |
| Supabase | Cloud (wxvhfwoawmdtrfxhcsun) | Postgres database |
| Neo4j | Hetzner | graph.ifnotfor.com |
| n8n | Hetzner | n8n.ifnotfor.com |
| Coda | Cloud | coda.io/d/Everything_dx8nvwL5l1e |
| Caddy | Hetzner | Reverse proxy + auto TLS |

## n8n Workflows

| Workflow | ID | Webhook | Direction |
|----------|----|---------|-----------|
| Supabase to Coda Sync | vTCO4RoxH8x2Awow | /webhook/supabase-to-coda | DB changes push to Coda |
| Coda to Supabase Sync | cVRbkOXrgx64ezFv | /webhook/coda-to-supabase | Coda edits push to DB |

## Docs

- [Supa-Coda Tango](docs/SUPA-CODA-TANGO.md) — Bidirectional sync architecture, custom Coda Pack source, n8n workflow details
- [Data Projects](docs/DATA-PROJECTS.md) — All 13 data project areas and their current status

## Coda Pack

The "n8n Webhook" pack (ID 50478) is a self-built Coda plugin that makes outgoing HTTP POST requests from Coda automations. Source code and modification instructions are in [SUPA-CODA-TANGO.md](docs/SUPA-CODA-TANGO.md#the-custom-pack).
