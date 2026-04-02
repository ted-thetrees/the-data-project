# Thinking

Notes on what we're building, what we've explored, and what we're considering. Nothing here is final.

---

## The idea

A web application for managing structured data (projects, features, user stories, tasks) with rich relationships between records — displayed in an editable, spreadsheet-like grid UI.

Think of it as a custom Airtable/Notion database built for a specific project management data model, where you can express and navigate relationships (a feature *contains* user stories, a story *has* tasks, a person *works on* features).

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

**Open question: Postgres (Supabase) vs. Neo4j**

Neo4j models relationships beautifully — it's literally designed for it. But the development experience around it is painful: no good ORMs, almost no starter templates, separate hosting (Neo4j Aura).

Postgres with join tables can model the same relationships. The queries are more verbose, but everything else gets dramatically easier: Drizzle ORM for type-safe queries, Supabase for one-click hosting with bundled auth/storage/real-time, and thousands of reference projects to learn from.

| | Neo4j | Postgres (Supabase) |
|---|---|---|
| Modeling relationships | Elegant, natural | Join tables — works, just more verbose |
| Ecosystem | Small, niche | Massive |
| ORM options | Basically none for JS | Drizzle, Prisma |
| Hosting | Neo4j Aura (separate) | Supabase on Vercel (one-click) |
| Bundled extras | None | Auth, real-time, file storage |

There may be a hybrid approach — Postgres for the main data, with graph queries for specific relationship-heavy features later.

### UI components

**Settled: shadcn/ui + Tailwind CSS**

No reason to change this. It worked well in v1, it's the community standard, and we own the component source code.

### Grid library

**Settled: TanStack Table v8**

Proven in the prototype. Headless (full rendering control), handles sorting, grouping, filtering. The only editable-grid example using it is [react-editable-table](https://github.com/muhimasri/react-editable-table) — worth studying when we get to inline editing.

### Data fetching

**Settled: TanStack Query**

Worked well in v1. Caching, background refetching, optimistic updates.

---

## Structural ideas

Things we want to get right from the start this time.

### Separate data from UI

UI components shouldn't talk to the database directly. A `queries/` folder (or similar) holds all database calls. Components call those functions. This means we can swap databases without rewriting UI, and test queries independently.

### Consistent folder structure

Something like:

```
src/
├── app/          routes (pages)
├── components/
│   ├── ui/       shadcn components
│   ├── grid/     grid-specific components
│   └── layout/   shell (sidebar, header)
├── lib/          database connection, utilities
├── queries/      all database queries
└── types/        TypeScript types
```

### GitHub workflow

- Issues for tracking work
- Milestones for grouping related issues
- One branch per feature
- Commit after each functional change

### Architecture Decision Records

A `docs/decisions/` folder for recording *why* we made choices (not just *what*). Short documents — a few paragraphs each. Useful when we come back in 3 months and wonder why things are the way they are.

---

## Open questions

- **Postgres vs. Neo4j** — see above. Need to make this call before writing code.
- **Auth** — do we need user accounts? If so, Supabase Auth or Clerk?
- **Deployment** — Vercel seems obvious, but we haven't set it up yet.
- **Data model** — the project management schema (projects → features → stories → tasks) needs to be written out formally before building anything.
- **What to build first** — probably a single grid (People?) end-to-end, from database to UI.

---

*Last updated: 2026-04-02*
