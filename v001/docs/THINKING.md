# Thinking

Notes on what we're building, what we've explored, and what we're considering. Nothing here is final.

---

## The idea

A web application for managing structured data (projects, features, user stories, tasks) with rich relationships between records — displayed in an editable, spreadsheet-like grid UI.

Think of it as a custom Airtable/Notion database built for a specific project management data model, where you can express and navigate relationships (a feature *contains* user stories, a story *has* tasks, a person *works on* features).

## Current state (April 2026)

The system is live at [data.ifnotfor.com](https://data.ifnotfor.com). The database question was resolved with a **hybrid approach**: Teable (self-hosted Airtable alternative) manages the data through its UI, backed by Supabase Postgres. Neo4j handles relationship-heavy graph queries. The Next.js app reads directly from Postgres for speed and writes through Teable's API to preserve business logic.

Five iterations of the Projects view were built (v001–v005), each trying a different rendering approach. The winner was v005 — a hand-built tree with a custom "Claude+" theme. The People view (v001) led to the extraction of a reusable `GroupableTable` component with multi-level grouping, depth-colored bands, and persistent UI state. See the main README for full details.

---

## What we learned from the first prototype

[grid-prototype](https://github.com/ted-thetrees/grid-prototype) was a working proof of concept with Neo4j, TanStack Table, and Next.js. Things that worked well:

- **TanStack Table** — headless, full control over rendering, sorting, grouping
- **TanStack Query** — caching, background refetching
- **shadcn/ui + Tailwind** — consistent UI, fast to build with
- **Hierarchical grouping** — nested row groups with merged cells
- **Committing frequently** — small, meaningful commits kept things manageable

Things that were harder than expected:

- **Neo4j ecosystem** — very few JavaScript/TypeScript reference projects, ORMs, or starter templates. Every problem required a custom solution with little community help.
- **Project organization** — the codebase grew organically without a clear structure from the start
- **No GitHub from day one** — version control was local-only, no issues or milestones to track work

---

## Tech stack considerations

These are the options we're weighing. Some feel more settled than others.

### Framework

**Leaning toward: Next.js (App Router)**

Every reference project we studied (Teable, Twenty, Cal.com) uses Next.js. The ecosystem is enormous — more tutorials, examples, and community help than any alternative. shadcn/ui is designed for it. Vercel deployment is zero-config.

The first prototype used Next.js and it worked fine. No strong reason to switch.

*Alternative considered*: TanStack Start — newer, smaller community, fewer reference projects. Interesting but riskier for a project built with AI assistance where ecosystem size = better help.

### Database

**Resolved: Hybrid — Supabase Postgres + Neo4j**

We went with Supabase Postgres as the primary data store (via Teable), with Neo4j for relationship-heavy graph queries. Teable manages the schema and provides an Airtable-like UI for direct data entry. The Next.js app reads from Postgres directly (fast) and writes through Teable's REST API (preserves field logic). Neo4j handles person-to-person relationships, synced from Supabase via webhooks.

| Concern | Solution |
|---|---|
| Entity storage | Supabase Postgres (via Teable) |
| Data entry UI | Teable (self-hosted at teable.ifnotfor.com) |
| Relationship queries | Neo4j (self-hosted on Hetzner) |
| Sync | Supabase → Neo4j via webhooks |

### UI components

**Settled: shadcn/ui + Tailwind CSS**

No reason to change this. It worked well in v1, it's the community standard, and we own the component source code.

### Grid library

**Resolved: Custom GroupableTable component**

We explored TanStack Table (in the grid-prototype), react-arborist (v002), @headless-tree (v003), Ant Design Tree (v004), and hand-built trees (v001, v005). The winner was hand-built React with a custom `GroupableTable` component extracted from the People v001 work. It provides multi-level grouping, depth-colored bands, column resizing, inline editing, and persistent state — all without a grid library dependency.

### Data fetching

**Resolved: Server components + revalidatePath**

Moved away from TanStack Query. All pages use Next.js server components with `force-dynamic`. After mutations (via Teable REST API server actions), `revalidatePath()` triggers a server-side refetch. No client-side data fetching layer needed.

---

## Structural ideas

### Separate data from UI (implemented)

Database queries live in `lib/db.ts`. Server actions for Teable writes live in each page's `actions.ts`. UI components receive data as props. The `GroupableTable` component is fully generic — it doesn't know about Teable or Postgres.

### Actual folder structure

```
app/
├── app/              # Routes (pages) — each page has its own actions.ts
├── components/
│   ├── groupable-table/  # Reusable multi-level grouping table
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── db.ts             # Postgres pool + all read queries
│   ├── passphrase.ts     # PGP passphrase system
│   ├── content.ts        # Content type detection, URL cleaning
│   ├── og.ts             # OG image fetching
│   └── utils.ts          # cn() utility
└── package.json
```

### Commit often (established practice)

Commit after each functional change, not batched at end of session. The git history for Projects v005 and People v001 has 20+ small, meaningful commits showing every iteration.

---

## Resolved questions

- **Postgres vs. Neo4j** — Hybrid. Both. See Database section above.
- **Deployment** — Vercel, linked via `vercel link`. Environment variables auto-provisioned.
- **What to build first** — Built Inbox first, then iterated on Projects (5 versions), then People.

## Open questions

- **Auth** — no user authentication yet. UI state is hardcoded to user "ted". Will need auth if other people use the system.
- **More tables** — only Inbox, Projects, and People have custom views so far. The other 10 project areas (Gatherings, CRM, Home Inventory, etc.) still need views.
- **Navigation** — no shared navigation between pages yet. Each page is accessed by direct URL.

---

*Last updated: 2026-04-04*
