# The Data Project

A unified system for managing Ted's structured data — project management, people/CRM, inbox capture, and more — built on Teable, Supabase, and Next.js.

**Live at**: [data.ifnotfor.com](https://data.ifnotfor.com)

## What this is

Rather than scattering data across Airtable, Notion, spreadsheets, and one-off tools, this is one flexible system that handles all of Ted's data projects with a consistent UI. The data lives in Teable (an open-source Airtable alternative) backed by Supabase Postgres, and the frontend is a custom Next.js app with purpose-built views for each dataset.

A [first prototype](https://github.com/ted-thetrees/grid-prototype) explored this with Neo4j and TanStack Table. This repo is the production successor, using a hybrid Postgres + Neo4j architecture (Supabase for entities, Neo4j for relationships).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App (data.ifnotfor.com)                                │
│  ├── Inbox .................. / (home page)                     │
│  ├── Projects v001–v005 ..... /projects, /projects-v2, etc.     │
│  ├── People v001 ............ /people                           │
│  └── API routes ............. /api/passphrase, /api/open, etc.  │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                     │
│  ├── Reads: Supabase Postgres (direct SQL via pg pool)          │
│  └── Writes: Teable REST API (preserves Teable triggers/logic)  │
├─────────────────────────────────────────────────────────────────┤
│  Teable (teable.ifnotfor.com)                                   │
│  └── Self-hosted on Hetzner (Docker)                            │
│      Tables: Inbox, Project_Matrix, People, Passphrases         │
├─────────────────────────────────────────────────────────────────┤
│  Supabase (cloud)                                               │
│  └── Postgres database (Teable's external DB)                   │
│      Also stores: ui_state (persisted table preferences)        │
├─────────────────────────────────────────────────────────────────┤
│  Neo4j (relationship graph)                                     │
│  └── Person-to-person relationships, introductions, etc.        │
│      Synced from Supabase via webhooks                          │
└─────────────────────────────────────────────────────────────────┘
```

### Why reads go through Supabase and writes go through Teable

Teable manages the database schema, field types, and business logic. Writing through the Teable API preserves all of that. But Teable's API for reading is paginated and slow for full-table loads, so the Next.js app reads directly from the underlying Supabase Postgres database for speed.

## Live Pages

| Route | Title | Description |
|-------|-------|-------------|
| `/` | Inbox | Card-based feed of captured items (URLs, text, YouTube videos). Shows OG images, passphrase badges, delete buttons. Uses shadcn/ui + Geist font. |
| `/projects` | Projects v001 | First project outline — collapsible tree with inline-editable task fields, tickle date badges, draggable column resizers. |
| `/projects-v2` | Projects v002 | Same data, rendered with [react-arborist](https://github.com/brimdata/react-arborist) tree component + shadcn Badge/Input/Select. |
| `/projects-v3` | Projects v003 | Same data, rendered with [@headless-tree](https://github.com/lukasbach/headless-tree). |
| `/projects-v4` | Projects v004 | Same data, rendered with [Ant Design](https://ant.design/) Tree + Tag + Select + DatePicker. Roboto Condensed via Typekit. Theme switcher (Default/Dark/Compact). |
| `/projects-v5` | Projects v005 | **Current best version.** Built from scratch with "Claude+" tweakcn theme. Warm earth tones, Outfit font. Tree: Uber Project → Project → Task. Inline-editable cells, tickle date badges with urgency coloring (overdue/soon/ok), draggable column resizers. Light/dark mode. |
| `/people` | People v001 | People directory using the reusable `GroupableTable` component. Multi-level grouping (up to 5 levels), depth-colored bands, 2px cell gaps, per-group sorting, photo column, persistent UI state. |

### Projects v001–v005: an evolution

Each version of the Projects page was an experiment with a different approach to rendering the same Uber Project → Project → Task tree:

1. **v001** — Hand-built collapsible tree with inline editing. First working version.
2. **v002** — react-arborist (drag-and-drop tree library). Explored tree DnD.
3. **v003** — @headless-tree (headless, no styling opinions). Explored headless approach.
4. **v004** — Ant Design (full component library). Explored opinionated UI kit.
5. **v005** — Back to hand-built, but with lessons learned. Best visual design (tweakcn theme), best UX.

## Reusable Components

### `GroupableTable`

The main reusable component, extracted from People v001 after extensive iteration. Located at `app/components/groupable-table/`.

**Features:**
- Multi-level nested grouping (up to 5 levels) with per-level sort direction
- Depth-colored bands — each nesting level gets a different hue via CSS variables (`--depth-0` through `--depth-4`)
- 2px gaps between all cells and rows (no traditional gridlines)
- Indentation (40px per level) aligns data rows under their group headers
- Column headers appear inside leaf groups
- Draggable column resizers
- Search/filter across configurable fields
- Inline editing (text fields and select dropdowns)
- Light/dark mode toggle
- **Persistent UI state** — column widths, sort field/direction, group configuration, open/collapsed groups, and mode are saved to `public.ui_state` in Supabase (hardcoded user "ted"), debounced at 500ms

**Files:**
| File | Purpose |
|------|---------|
| `groupable-table.tsx` | Main component: toolbar, nested group rendering, state management |
| `types.ts` | `ColumnDef`, `GroupableField`, `TableRow` interfaces |
| `col-context.tsx` | React context + `ColResizer` for draggable column widths |
| `editable-cells.tsx` | `EditableText` and `EditableSelect` inline editing components |
| `styles.ts` | CSS-in-JS styles, depth colors, gap/indent constants |
| `state-actions.ts` | Server actions to load/save UI state from `public.ui_state` table |
| `index.ts` | Public exports |

**Usage example** (from People v001):
```tsx
<GroupableTable
  title="People"
  data={people}
  columns={columns}         // ColumnDef[] with key, label, type, width, options
  groupableFields={fields}  // GroupableField[] — which columns can be grouped
  searchFields={["name", "known_as", "metro_area"]}
  onUpdate={(recordId, field, value) => updatePersonField(recordId, field, value)}
/>
```

### "Claude+" Theme

The visual theme used by Projects v005 and People v001. Located at `app/app/projects-v5/theme.css`.

- **Font**: Outfit (Google Fonts)
- **Colors**: Warm earth tones — terracotta primary (`#c96442`), cream background (`#faf9f5`), dark brown text (`#3d3929`)
- **Depth colors**: 5 subtly different hues for nested group backgrounds
- **Light and dark modes** with full variable sets
- **Border radius**: 1rem

Other pages (Inbox, v001–v004) use the default shadcn theme with Geist/Figtree fonts.

## Data Model

### Teable Tables

All tables live in Teable at `teable.ifnotfor.com`, backed by Supabase Postgres in schema `bsePwEnYg0x7fdbsdZR`.

| Table | Teable ID | Postgres Table | Purpose |
|-------|-----------|----------------|---------|
| Inbox | `tblxWdmSHnBdDYjcmKX` | `"bsePwEnYg0x7fdbsdZR"."Inbox"` | Captured items (URLs, text, notes) |
| Project_Matrix | `tblvtt4qK8mtiWhz512` | `"bsePwEnYg0x7fdbsdZR"."Project_Matrix"` | Projects/tasks with Uber Project grouping |
| People | `tblyvrNXdqftQGNIniT` | `"bsePwEnYg0x7fdbsdZR"."People"` | People directory with familiarity, metro area, etc. |
| Passphrases | `tblBYrVi2x3KeZOIzYZ` | `"bsePwEnYg0x7fdbsdZR"."Passphrases"` | 3-word PGP passphrases linked to records |

### UI State Table

Separate from Teable, in the `public` schema:

```sql
CREATE TABLE public.ui_state (
  user_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  state JSONB,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, table_name)
);
```

Stores persisted table preferences (column widths, sort, groups, mode) per user per table. Currently hardcoded to user "ted".

### Key Teable Field IDs

**Project_Matrix:**
| Field | ID |
|-------|----|
| Tickle_Date | `fldOROoCmhf73IT107l` |
| Task | `fld12VKNDITfIODCrEA` |
| Task_Status | `fldenzRVC15eV6S5q2r` |
| Task_Result | `fld8YTgDOZZA21l1sOb` |
| Task_Notes | `fldGslWW53tx0e776eK` |

**People:**
| Field | ID |
|-------|----|
| Name | `fldSPVtMzXTa6fENhat` |
| Familiarity | `fldH5ozoEn1Kg4Nipvd` |
| Gender | `fldRuJWVkFxHg7ucuMU` |
| Known_As | `fldrvcZnhTn4QWZ6bNi` |
| Metro_Area | `flduOaiuIi8btT9sANI` |
| Has_Org_Filled | `fldlebuohufqa0fwkD7` |
| Target_Desirability | `fldFgI9S4GmUkC0lCuc` |
| Teller_Status | `fldxYGQdd5YWbKJ16Jg` |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/passphrase` | POST | Assigns a unique 3-word PGP passphrase to a record. Auto-tidies text content and cleans URL tracking params. Retries on uniqueness conflicts. |
| `/api/open` | GET | Opens a URL via macOS `open` command and redirects home. Used with Choosy for browser routing to Zen. |
| `/api/teable-image/[token]` | GET | Proxies private Teable attachment images. Streams the image with 24-hour cache headers. |

### Passphrase System

Every record can be assigned a voice-friendly 3-word passphrase (e.g., "Repay inventive crackdown") using PGP word lists. The pattern is even-word + odd-word + even-word (2-syllable + 3-syllable + 2-syllable), matching PGP's design for error detection. Passphrases are unique and case-insensitive for lookup.

## Infrastructure

| Service | Location | URL |
|---------|----------|-----|
| Next.js app | Hetzner (178.156.235.239) | [data.ifnotfor.com](https://data.ifnotfor.com) |
| Teable | Hetzner (178.156.235.239) | [teable.ifnotfor.com](https://teable.ifnotfor.com) |
| Supabase | Cloud | Postgres database (connection string in env vars) |
| Neo4j | Hetzner (178.156.235.239) | [graph.ifnotfor.com](https://graph.ifnotfor.com) |
| Caddy | Hetzner (178.156.235.239) | Reverse proxy + auto TLS for all services |

### Environment Variables

Provisioned via `vercel env pull`:
- `DATABASE_URL` — Supabase Postgres connection string (used by `lib/db.ts`)
- `TEABLE_API_KEY` — Teable REST API bearer token
- `TEABLE_URL` — Teable instance URL (defaults to `https://teable.ifnotfor.com`)
- `POSTGRES_*` / `SUPABASE_*` — Supabase connection details (from Vercel integration)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database reads | Supabase Postgres (via `pg` pool, direct SQL) |
| Database writes | Teable REST API |
| Data management UI | Teable (self-hosted) |
| Fonts | Geist + Geist Mono (default), Figtree (layout), Outfit (Claude+ theme) |
| Deployment | Vercel |
| Server | Hetzner VPS (Teable, Neo4j, n8n, MCP servers) |

### Key Dependencies

- `next` 16.2.2, `react` 19.2.4
- `pg` — PostgreSQL client for direct Supabase queries
- `shadcn` + `lucide-react` — UI components and icons
- `timeago.js` — Relative timestamps
- `linkifyjs` + `linkify-react` — Auto-link detection
- `antd` — Used only by Projects v004
- `react-arborist` — Used only by Projects v002
- `@headless-tree/*` — Used only by Projects v003

## Project Structure

```
the-data-project/
├── app/                          # Next.js application
│   ├── app/
│   │   ├── page.tsx              # Inbox (home page)
│   │   ├── actions.ts            # Inbox server actions (delete record)
│   │   ├── layout.tsx            # Root layout (Geist + Figtree fonts)
│   │   ├── globals.css           # shadcn theme variables (oklch)
│   │   ├── projects/             # Projects v001
│   │   ├── projects-v2/          # Projects v002 (react-arborist)
│   │   ├── projects-v3/          # Projects v003 (@headless-tree)
│   │   ├── projects-v4/          # Projects v004 (Ant Design)
│   │   ├── projects-v5/          # Projects v005 (Claude+ theme) ★
│   │   │   ├── page.tsx          # Server component, builds tree from DB
│   │   │   ├── claude-tree.tsx   # Client component, full tree UI
│   │   │   ├── actions.ts        # Server actions for Teable writes
│   │   │   └── theme.css         # Claude+ theme (Outfit, earth tones)
│   │   ├── people/               # People v001 ★
│   │   │   ├── page.tsx          # Server component, fetches people
│   │   │   ├── people-table.tsx  # Client: column defs + GroupableTable
│   │   │   └── actions.ts        # Server actions for Teable writes
│   │   └── api/
│   │       ├── passphrase/       # Passphrase assignment
│   │       ├── open/             # URL opener (Choosy integration)
│   │       └── teable-image/     # Image proxy for Teable attachments
│   ├── components/
│   │   ├── groupable-table/      # Reusable GroupableTable component ★
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/
│   │   ├── db.ts                 # Postgres pool + query functions
│   │   ├── passphrase.ts         # PGP passphrase generation/lookup
│   │   ├── pgp-words.ts          # PGP even/odd word lists
│   │   ├── content.ts            # Content type detection, URL cleaning
│   │   ├── og.ts                 # OG image fetching with cache
│   │   └── utils.ts              # cn() utility
│   └── package.json
├── docs/
│   ├── DATA-PROJECTS.md          # All 13 data project areas
│   ├── THINKING.md               # Technical decisions and exploration
│   └── RESOURCES.md              # Reference projects and resources
├── teable/
│   └── docker-compose.yaml       # Teable self-hosted setup
└── README.md                     # This file
```

## Design Decisions

### No traditional gridlines
After extensive iteration (adding gridlines, fixing alignment, rolling back twice), we settled on **2px gaps between cells** that reveal the page background. This creates visual separation without the clutter of border lines.

### Depth-colored bands
Each nesting level in GroupableTable uses a subtly different hue (not just darker/lighter of the same color). The colors are defined as CSS variables (`--depth-0` through `--depth-4`) in the theme, with opaque values composited against the page background to avoid transparency artifacts.

### Server-side data fetching
All pages use `force-dynamic` and server components for data fetching. No client-side data fetching or TanStack Query — the app relies on Next.js server component patterns with `revalidatePath()` after mutations.

### Teable field IDs in server actions
Each server action file hardcodes the Teable table ID and field IDs. This is deliberate — Teable's API uses field IDs (not names) for writes, and these IDs are stable. The mapping is explicit rather than discovered at runtime.

## Docs

- [Data Projects](docs/DATA-PROJECTS.md) — All 13 project areas this system needs to handle
- [Thinking](docs/THINKING.md) — Technical considerations and what we've explored
- [Resources](docs/RESOURCES.md) — Reference projects and things worth studying

## Deployment

The Next.js app runs directly on the Hetzner server (`178.156.235.239`), behind Caddy reverse proxy. There is no local build step — code is pushed to GitHub, pulled on the server, built there, and restarted.

### Deployment process

```bash
# 1. Push to GitHub
git push origin main

# 2. SSH into Hetzner and pull
ssh root@178.156.235.239
cd /root/the-data-project && git pull origin main

# 3. Install dependencies and build
cd app && npm install && npx next build

# 4. Restart the app
pkill -f 'next-server'
NODE_ENV=production nohup npx next start -p 3100 > /root/nextjs-app.log 2>&1 &
```

The app is served on port 3100. Caddy handles TLS and proxies `data.ifnotfor.com` → `localhost:3100`.

### Server layout on Hetzner

| Service | Port | URL | How it runs |
|---------|------|-----|-------------|
| Next.js app | 3100 | data.ifnotfor.com | `next start` (bare process, nohup) |
| Teable | 3030 | teable.ifnotfor.com | Docker Compose (`/root/teable/`) |
| Neo4j Browser | 7474 | graph.ifnotfor.com | Docker |
| Neo4j Bolt | 7687 | bolt.ifnotfor.com | Docker |
| n8n | 5678 | n8n.ifnotfor.com | Docker |
| Caddy | 80/443 | — | Reverse proxy + auto TLS for all services |

Caddy config: `/etc/caddy/Caddyfile`
App log: `/root/nextjs-app.log`

### Environment variables on server

The server has its own `.env.local` at `/root/the-data-project/app/.env.local` with:
- `DATABASE_URL` — Supabase Postgres connection string
- `TEABLE_API_KEY` — Teable REST API bearer token
- `TEABLE_URL` — `https://teable.ifnotfor.com`
- `NODE_ENV` — `production`

These are **not** synced from Vercel. They were set up manually on the server and are separate from the Vercel env vars used for local development (`vercel env pull`).

### Important notes

- **No process manager** — the app runs as a bare `nohup` process. If the server reboots, it needs to be restarted manually (or added to `/root/start-services.sh`).
- **No CI/CD** — deployment is manual. Push → SSH → pull → build → restart.
- **Build on server, not locally** — we do not build locally and transfer artifacts. The server has Node.js installed and builds from source.
- **Vercel project is linked** but only used for `vercel env pull` during local development, not for hosting.

## Development

```bash
cd app
npm install
vercel env pull .env.local   # Get environment variables (local dev only)
npm run dev                  # http://localhost:3000
```

Requires Node.js and a linked Vercel project (`vercel link`).
