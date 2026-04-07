# Sync or Swim

> Bidirectional sync between Supabase and Coda, so you can edit your project data in either place and it just stays in sync.

## The Problem

Project and task data lives in two places:

- **Coda** — a spreadsheet where you manually rearrange, bulk-edit, and visually manage projects and tasks
- **Supabase** — a proper database where Claude Code creates projects via voice dictation

If you change something in Coda, Supabase doesn't know. If Claude creates a project in Supabase, Coda doesn't know. Both need to stay in sync automatically.

## The Solution: Two One-Way Pipes

Instead of one complicated two-way sync, there are two simple one-way pipes.

### Pipe 1: Supabase to Coda

*Something changes in the database.*

1. Claude creates or updates a project/task in Supabase
2. A Postgres trigger notices the change
3. The trigger sends the row data to n8n (a workflow tool on the Hetzner server)
4. n8n translates the database fields into Coda column names and upserts the row into the Coda table

### Pipe 2: Coda to Supabase

*You edit something in the spreadsheet.*

1. You change a cell in the Coda table
2. A Coda automation rule notices the edit
3. It calls a tiny custom plugin (the "n8n Webhook" pack) that sends the row data to n8n
4. n8n translates the Coda column names back into database fields and updates Supabase

## The Infinite Loop Problem

Without protection, this would loop forever: Supabase change syncs to Coda, Coda sees a change, syncs back to Supabase, Supabase sees a change, syncs to Coda, forever.

This is prevented with a boolean flag called `_coda_sync` on every row:

- When **Coda syncs to Supabase**, the database function sets `_coda_sync = true` on the row
- When Supabase's trigger fires, it checks that flag. If it's `true`, it knows "this change came from Coda, don't send it back" — it flips the flag to `false` and does nothing
- If the flag is `false`, it's a real change (from Claude or a direct DB edit), so it sends it to Coda

One flag, checked once, consumed immediately. No loop possible.

## Delete Sync

Deletes need special handling because when you delete a row, there's no "new version" to sync — the row is just gone. A separate trigger on the tasks table fires when a row is deleted. It sends a "delete" message to n8n, which looks up the matching row in Coda by its Supabase Task ID and removes it.

## The Custom Coda Pack

Coda has no built-in way to call an external URL from an automation. Every existing third-party plugin either only receives incoming webhooks or only talks to other Coda docs. So we built a 30-line plugin in Coda's Pack Studio that does one thing: POST JSON to a URL. It's self-owned, has no third-party dependency, and is locked to only talk to `n8n.ifnotfor.com`.

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

| Piece | Where | What it does |
|---|---|---|
| `handle_task_sync()` | Supabase trigger | Notices task changes, sends to n8n |
| `handle_project_sync()` | Supabase trigger | Notices project changes, sends to n8n |
| `handle_task_delete()` | Supabase trigger | Notices task deletions, sends to n8n |
| `sync_from_coda()` | Supabase function | Receives Coda data, updates DB with flag set |
| `_coda_sync` flag | Supabase column | Prevents infinite loops |
| Supabase-to-Coda workflow (`vTCO4RoxH8x2Awow`) | n8n | Translates DB fields to Coda columns, upserts or deletes |
| Coda-to-Supabase workflow (`cVRbkOXrgx64ezFv`) | n8n | Translates Coda columns to DB fields, calls sync function |
| n8n Webhook pack (ID 50478) | Coda | Sends HTTP POST from Coda automations |
| Rule 2 automation | Coda | Fires on row edits, calls the pack |
| Master \| Main View Table (`grid-Z4F8GQGdrb`) | Coda | The spreadsheet that shows everything |

## What Just Works Now

- Create a project via Claude Code -> appears in Coda
- Edit a cell in Coda -> updates in Supabase
- Delete a task in Supabase -> disappears from Coda
- No loops, no polling, no manual sync needed
