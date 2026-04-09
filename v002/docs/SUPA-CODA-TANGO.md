# Supa-Coda Tango

> Bidirectional sync between Supabase and Coda, so you can edit your data in either place and it just stays in sync.

## The Problem

Data lives in two places:

- **Coda** — a spreadsheet where you manually rearrange, bulk-edit, and visually manage records
- **Supabase** — a proper database where Claude Code creates records via voice dictation

If you change something in Coda, Supabase doesn't know. If Claude creates a record in Supabase, Coda doesn't know. Both need to stay in sync automatically.

## Synced Tables

| Supabase Table | Coda Table | Coda Grid ID |
|---|---|---|
| `projects` + `tasks` | Master \| Main View Table | `grid-Z4F8GQGdrb` |
| `people` | People \| Master | `grid-4jNGN5Vmgs` |
| `talent` | Talent | `grid-nWL5HfnVj7` |
| `talent_areas` + `talent_area_links` | Talent \| Areas | `grid-QL0XIVxT0Z` |

## Architecture

### Pipe 1: Supabase to Coda (via Outbox)

```
Supabase write (Claude Code, API, or direct SQL)
  -> BEFORE trigger computes content hash
  -> If hash unchanged: skip (no real change)
  -> If hash changed: write to sync_outbox table
  -> Outbox Delivery workflow (n8n, polls every 30s)
  -> Reads pending outbox items
  -> Routes to correct Coda webhook by table name
  -> Delivers payload, marks as delivered
  -> On failure: increments retry_count, logs error
```

### Pipe 2: Coda to Supabase (via Pack + Webhook)

```
Coda cell edit
  -> Coda automation fires (Row changed trigger)
  -> n8n Webhook pack POSTs to n8n
  -> n8n checks: has Supabase ID?
     -> Yes: calls sync RPC (with conflict detection)
     -> No: INSERTs new record, writes ID back to Coda
  -> sync RPC checks updated_at for conflicts
  -> Updates record with _coda_sync=true and new sync_hash
```

### Pipe 3: Catch-up Pollers (for new rows and relations)

```
Every 5 minutes:
  -> Scan Coda for rows with no Supabase ID
  -> Create in Supabase, write ID back to Coda

Every 5 minutes (Talent Areas):
  -> Compare Coda relation columns vs junction table
  -> Sync any differences
```

## Hardening (v2)

Three production-grade improvements over the original design:

### 1. Outbox Pattern (replaces direct webhook calls)

Triggers no longer call webhooks directly. Instead, they write to a `sync_outbox` table within the same Postgres transaction. A separate n8n workflow polls the outbox every 30 seconds and delivers items, marking them as delivered only on confirmed success.

**Why:** If n8n is down or the Coda API times out, direct webhook calls lose the event forever. The outbox guarantees at-least-once delivery with retries.

**Tables:**
- `sync_outbox` — queue of pending deliveries with status, retry_count, last_error, delivered_at

### 2. Content Hash (replaces boolean `_coda_sync` flag)

Each synced table has a `sync_hash` column containing an MD5 hash of the synced fields. The trigger computes the hash of the new row and compares it to the stored hash. If they match, the change came from a sync operation and is skipped. If they differ, it's a real change.

**Why:** The boolean `_coda_sync` flag had a race window — two rapid changes could slip through before the flag was consumed. Content hashing is deterministic and race-free.

**Note:** The `_coda_sync` boolean is retained for backward compatibility during transition. The hash is the primary loop prevention mechanism.

### 3. Conflict Detection (via `updated_at` timestamps)

Each sync RPC function checks whether the record was updated in Supabase within the last 10 seconds (and not by Coda). If so, it logs a conflict to the `sync_conflicts` table before applying the Coda change (last-write-wins, but with an audit trail).

**Why:** Without this, concurrent edits from both sides silently overwrite each other. Now there's a record of every conflict.

**Tables:**
- `sync_conflicts` — log of detected conflicts with source, timestamps, and resolution status

## Loop Prevention (how it works now)

1. **Supabase change** -> trigger computes content hash -> writes to outbox -> outbox delivers to Coda
2. **Coda automation fires** (because the row changed) -> POSTs to n8n -> n8n calls sync RPC
3. **sync RPC** updates the record AND sets the sync_hash to match the new content
4. **Trigger fires again** (because of the UPDATE) -> computes hash -> hash matches stored hash -> **skips** (no outbox entry)

No loop. The hash comparison is the gatekeeper, not a consumable flag.

## The Custom Coda Pack

Coda has no built-in way to call an external URL from an automation. We built a 30-line plugin in Coda's Pack Studio that does one thing: POST JSON to a URL.

Source code: [Pack Studio](https://coda.io/p/50478)

```javascript
import * as coda from "@codahq/packs-sdk";
export const pack = coda.newPack();

pack.addNetworkDomain("n8n.ifnotfor.com");

pack.addFormula({
  name: "PostWebhook",
  description: "POST JSON data to a webhook URL.",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "url",
      description: "The webhook URL to POST to.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "body",
      description: "The JSON body to send.",
    }),
  ],
  resultType: coda.ValueType.String,
  isAction: true,
  execute: async function ([url, body], context) {
    let response = await context.fetcher.fetch({
      method: "POST",
      url: url,
      headers: { "Content-Type": "application/json" },
      body: body,
    });
    return "OK: " + response.status;
  },
});
```

## All the Pieces

### Supabase (Database)

| Component | Purpose |
|---|---|
| `sync_outbox` table | Reliable delivery queue for all outgoing sync events |
| `sync_conflicts` table | Audit log of detected concurrent-edit conflicts |
| `sync_hash` column (all tables) | MD5 hash of synced fields for loop prevention |
| `updated_at` column (all tables) | Timestamp for conflict detection |
| `compute_sync_hash()` | Immutable function to hash field values |
| `handle_task_sync()` | BEFORE trigger: hash check -> outbox write |
| `handle_project_sync()` | BEFORE trigger: hash check -> outbox write |
| `handle_people_sync()` | BEFORE trigger: hash check -> outbox write |
| `handle_talent_sync()` | BEFORE trigger: hash check -> outbox write |
| `handle_*_delete()` | BEFORE DELETE triggers: outbox write |
| `sync_from_coda()` | RPC: conflict check -> update tasks with hash |
| `sync_people_from_coda()` | RPC: conflict check -> update people with hash |
| `sync_talent_from_coda()` | RPC: conflict check -> update talent with hash |
| `sync_talent_areas_from_coda()` | RPC: replace junction table entries |
| `create_project_from_coda()` | RPC: create project + task from Coda |

### n8n (Workflow Orchestrator)

| Workflow | ID | Purpose |
|---|---|---|
| Outbox Delivery | `m4yKY8sW9WMCLu1B` | Polls outbox every 30s, delivers to Coda |
| Supabase → Coda Sync | `vTCO4RoxH8x2Awow` | Projects/Tasks: upsert or delete in Coda |
| Coda → Supabase Sync | `cVRbkOXrgx64ezFv` | Projects/Tasks: create or update in Supabase |
| Supabase → Coda People | `J9buOHD5x45ol1mY` | People: upsert or delete in Coda |
| Coda → Supabase People | `0NC3O62bsxWhaK8d` | People: create or update in Supabase |
| Supabase → Coda Talent | `VeWikBhduihcnBhB` | Talent: upsert or delete in Coda |
| Coda → Supabase Talent | `3CDrdpwwSvHZazsm` | Talent: create or update in Supabase |
| Catch Unsynced (People) | `83lNZjmtlIWlCbwU` | Polls for new Coda people rows every 5m |
| Catch Unsynced (Talent) | `YyyI63mqpmyNaxfK` | Polls for new Coda talent rows every 5m |
| Sync Talent Areas | `cN4gilDeq0jHGQ2G` | Polls for relation column changes every 5m |

### Coda (Visual Editing Layer)

| Component | Purpose |
|---|---|
| n8n Webhook pack (ID 50478) | Sends HTTP POST from automations |
| INF API pack (ID 50557) | Full Coda API access (read tables, rows, permissions) |
| Projects Sync automation | Row changed -> POST to n8n |
| People Sync automation | Row changed -> POST to n8n |
| Talent Sync automation | Row changed -> POST to n8n |

## Known Limitations

- **Coda relation columns don't trigger automations** — changes to many-to-many relations (like Talent Areas) only sync via the 5-minute poller, not in real-time
- **New rows need a cell edit to trigger** — creating a row in Coda doesn't fire "Row changed"; the 5-minute catch-up poller handles this
- **Coda API can't create tables or columns** — schema changes must be done in the Coda UI
- **Rich format backticks** — Coda's rich API format wraps text values in backticks; all workflows strip these

## What Just Works

- Create a project via Claude Code -> appears in Coda within 30 seconds
- Edit a cell in Coda -> updates in Supabase immediately
- Delete a record in Supabase -> disappears from Coda within 30 seconds
- Add a new person in Coda -> appears in Supabase within 5 minutes
- Assign areas to talent in Coda -> junction table updates within 5 minutes
- Concurrent edits from both sides -> last-write-wins with conflict logged
- n8n goes down -> events queue in outbox, delivered when n8n recovers
