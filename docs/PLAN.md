# Project Plan

This document captures the architectural decisions and development plan for Grid v2 — a fresh start building a data grid application backed by a real database.

---

## What we're building

A web application for managing structured data (projects, features, user stories, tasks) with rich relationships between records — displayed in an editable, spreadsheet-like grid UI.

Think of it as a custom Airtable/Notion database built for a specific project management data model, with the ability to express and navigate relationships (a feature *contains* user stories, a story *has* tasks, a person *works on* features).

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Next.js (App Router) | Largest ecosystem, most reference projects, best deployment story, zero-config on Vercel |
| **UI components** | shadcn/ui + Tailwind CSS | Industry standard for React apps, copy-paste components you own, great dark mode |
| **Grid / table** | TanStack Table v8 | Headless — full control over rendering, sorting, grouping, filtering. Used in grid-prototype v1 |
| **Data fetching** | TanStack Query | Caching, background refetching, optimistic updates. Also used in v1 |
| **Database** | Postgres via Supabase | Massive ecosystem, excellent TypeScript tooling, bundled auth/storage/real-time, one-click Vercel integration |
| **ORM** | Drizzle | Type-safe, SQL-like syntax, lightweight, great migration story |
| **Deployment** | Vercel | Auto-deploys from GitHub, preview URLs for every PR |

### Why Postgres instead of Neo4j?

Grid v1 used Neo4j (a graph database). Neo4j models relationships beautifully, but:

- The Neo4j + JavaScript ecosystem is very small — almost no starter templates, ORMs, or reference projects
- Every problem required custom solutions with little community help
- Hosting is a separate service (Neo4j Aura) with its own billing and configuration

Postgres with proper join tables handles the same relationships. The queries are more verbose, but everything else in the development experience is dramatically easier: better ORMs (Drizzle), more reference projects, one-click hosting (Supabase on Vercel Marketplace), and bundled auth/storage/real-time.

**The trade-off**: Relationships are slightly uglier in the database, but 10x easier to build and maintain everything around them.

### Why Next.js instead of TanStack Start?

Grid v1 explored TanStack Start. Next.js was chosen for v2 because:

- Every reference project we studied (Teable, Twenty, Cal.com) uses Next.js
- The ecosystem is 100x larger — more tutorials, examples, Stack Overflow answers
- shadcn/ui is designed for Next.js first
- Vercel deployment is zero-config
- For a project built with AI assistance, ecosystem size directly translates to better help

---

## Project structure

```
grid-v2/
├── docs/
│   ├── PLAN.md               ← you are here
│   ├── RESOURCES.md           reference projects and learning resources
│   └── decisions/             architecture decision records
├── src/
│   ├── app/                   Next.js routes (App Router)
│   │   ├── layout.tsx         root layout — sidebar, providers, fonts
│   │   ├── page.tsx           home / dashboard
│   │   └── people/
│   │       └── page.tsx       people grid (thin — delegates to components)
│   ├── components/
│   │   ├── ui/                shadcn components (Button, Dialog, etc.)
│   │   ├── grid/              grid components (DataGrid, Cell, ColumnHeader)
│   │   └── layout/            shell components (Sidebar, PageHeader)
│   ├── lib/
│   │   ├── db.ts              database connection (Drizzle + Supabase)
│   │   └── utils.ts           shared utilities (cn() helper, etc.)
│   ├── queries/               all database queries — separated from UI
│   │   ├── people.ts
│   │   └── projects.ts
│   └── types/                 TypeScript type definitions
│       ├── person.ts
│       └── project.ts
├── .env.local                 secrets (never committed)
├── .gitignore
├── README.md
└── package.json
```

**Key principle**: UI components never talk to the database directly. They call functions from `queries/`, which use Drizzle to talk to Postgres. This separation means you can change the database without rewriting the UI, and you can test queries independently.

---

## Development process

### Milestones

Each milestone is a chunk of work that results in something visible and working. Each gets tracked as a GitHub Milestone with individual Issues inside it.

1. **Scaffold** — Create the Next.js project, install dependencies, set up Supabase, deploy to Vercel
2. **Data model** — Define the Postgres schema with Drizzle, write migrations, seed with real data
3. **Shell** — Build the app layout (sidebar, page header, content area) with shadcn/ui
4. **First grid** — People grid end-to-end: database query → TanStack Table → rendered grid
5. **Inline editing** — Click a cell to edit, save changes back to the database
6. **Relationships** — Linked record fields (a person works on features, a feature belongs to a project)
7. **Multiple grids** — Projects, Features, User Stories, Tasks — each with their own grid page
8. **Filtering and sorting** — Column-level filters, multi-column sort
9. **Grouping** — Hierarchical row grouping (ported from grid-prototype v1)

### Workflow

- **One branch per feature** — work on `add-people-grid`, merge to `main` when it works
- **Commit after each functional change** — not batched at end of session
- **GitHub Issues** — one issue per piece of work, labeled and assigned to a milestone
- **Deploy on every push** — Vercel auto-deploys from `main`, preview URLs from branches

### What to study from reference projects

When we need to implement a specific feature, consult these projects first:

| Feature needed | Study this |
|----------------|-----------|
| Grid cell editing | [Teable](https://github.com/teableio/teable), [react-editable-table](https://github.com/muhimasri/react-editable-table) |
| Relationship fields in grid | [Twenty](https://github.com/twentyhq/twenty) |
| Folder structure / code organization | [Cal.com](https://github.com/calcom/cal.com), [next-forge](https://github.com/haydenbleasel/next-forge) |
| TanStack Start patterns (if needed) | [tanstarter](https://github.com/mugnavo/tanstarter) |
| Dashboard layout | [Teable](https://github.com/teableio/teable), [Plane](https://github.com/makeplane/plane) |

---

## Decisions log

Major decisions are recorded here briefly. Detailed reasoning goes in `docs/decisions/`.

| # | Decision | Date | Notes |
|---|----------|------|-------|
| 1 | Use Postgres (Supabase) instead of Neo4j | 2026-04-02 | Ecosystem size > elegant graph queries |
| 2 | Use Next.js instead of TanStack Start | 2026-04-02 | Ecosystem size, reference projects, deployment |
| 3 | Use Drizzle instead of Prisma | 2026-04-02 | Lighter, SQL-like, better migration story |
| 4 | Keep TanStack Table from v1 | 2026-04-02 | Proven, headless, full control |
| 5 | Keep shadcn/ui from v1 | 2026-04-02 | No reason to change — it's great |
