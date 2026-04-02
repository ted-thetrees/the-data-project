# Resource Library

Reference projects, starter templates, and learning resources.

---

## Editable Data Grid Applications

Open source apps with spreadsheet-like UIs. Study these for grid patterns, cell editing, field types, and relationship handling.

| Project | Stars | Stack | Why it's relevant |
|---------|-------|-------|-------------------|
| [Teable](https://github.com/teableio/teable) | 21,080 | Next.js + React + Postgres | Closest to what we're building. Airtable-style grid on a real database. |
| [Twenty](https://github.com/twentyhq/twenty) | 43,489 | React + NestJS + GraphQL + Postgres | CRM with editable record tables. Best reference for relationship fields in a grid. |
| [NocoDB](https://github.com/nocodb/nocodb) | 62,588 | Vue + Node.js | Most mature grid app. Vue (not React), but excellent data model and field-type system. |
| [Grist](https://github.com/gristlabs/grist-core) | ~7,000 | React + Python + SQLite | Spreadsheet/database hybrid. Reference columns for linked records. |
| [react-editable-table](https://github.com/muhimasri/react-editable-table) | 146 | React + TanStack Table v8 | Small but the only example using TanStack Table for inline editing. |

---

## Project Organization References

Well-structured codebases to study for folder structure, code organization, and best practices.

| Project | What to study |
|---------|---------------|
| [Cal.com](https://github.com/calcom/cal.com) | Turborepo monorepo layout, shared packages, clean separation of concerns |
| [Plane](https://github.com/makeplane/plane) | Project management app — grid views, table views, entity relationships |
| [next-forge](https://github.com/haydenbleasel/next-forge) | Production SaaS starter — how to structure a modern Next.js app |

---

## Neo4j / Graph References (from v1)

Kept for reference since v1 used Neo4j. May be useful if graph queries are needed later.

| Project | Description |
|---------|-------------|
| [NeoDash](https://github.com/neo4j-labs/neodash) | Neo4j's official dashboard builder. Best React + Neo4j reference. |
| [use-neo4j](https://github.com/adam-cowley/use-neo4j) | React hooks for Neo4j. Small, readable. |
| [GRAND Stack Starter](https://github.com/grand-stack/grand-stack-starter) | GraphQL + React + Apollo + Neo4j. Outdated but pattern is valid. |
| [CustomerOS](https://github.com/customeros/customeros) | CRM built on Neo4j. Go backend. |
| [G6VP](https://github.com/antvis/G6VP) | Graph visualization platform from Alibaba. |

---

## What to look at in reference repos

Don't read all the code. Focus on:

- **Folder structure** — how they organize by responsibility
- **`package.json`** — what libraries they chose
- **Component files** — small and focused, or big and tangled?
- **Data fetching layer** — is it separated from UI?
- **Design system** — how they use shadcn/ui or equivalent

---

*Last updated: 2026-04-02*
