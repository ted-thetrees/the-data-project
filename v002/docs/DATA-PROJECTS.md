# Data Projects

All the data-related projects this system needs to handle, what connects them, and where the data lives today.

---

## The center: People and Relationships

People show up in almost every project below. But more importantly, the relationships *between* people are first-class data — not just "who is connected to what," but "who have I introduced to whom," "who has expressed interest in a friendship with whom," and "who have I invited to which gatherings."

This is the core of Ted's business: relationship-seeding and gathering-organizing. The system needs to track:

- **Person-to-person introductions** — who introduced whom, when, context
- **Friendship interest** — who has expressed interest in connecting with whom (directional — A is interested in B doesn't mean B is interested in A)
- **Gatherings** — events organized, who was invited, who attended, who connected at the event
- **Contact cadence** — when did I last reach out, how often should I, what did we talk about
- **Roles/context** — how do I know this person, what's their relationship to my business, are they a host, a guest, a collaborator

This is inherently a graph — people connected to people through typed, directional relationships with metadata (dates, context, strength). Worth keeping in mind for the database decision.

---

## All projects

### 1. People & Relationships (core)
**What**: The central people database and the web of connections between them.
**Key data**: Contact info, how I know them, introductions made, friendship interests, gathering history, last contact, contact frequency goals.
**Where it lives today**: Supabase `people` table → custom view at [data.ifnotfor.com/people-v3](https://data.ifnotfor.com/people-v3). Fields: Name, Photo, Familiarity, Gender, Known As, Metro Area, Org Filled, Desirability, Teller Status. Person-to-person relationships tracked in Neo4j. Previously in Teable, migrated to Supabase as the single source of truth.
**Connects to**: Everything.

### 2. Gatherings
**What**: Events I organize — who was invited, who came, who connected.
**Key data**: Event name, date, location, guest list, invitations sent, attendance, new connections formed.
**Where it lives today**: _TBD_
**Connects to**: People & Relationships (heavily).

### 3. Project Management
**What**: Tracking projects, features, user stories, tasks.
**Key data**: Uber Project → Project → Task, with status (Tickled/Done), result, notes, tickle dates.
**Where it lives today**: Supabase (normalized: `uber_projects`, `projects`, `tasks`, plus status lookup tables) with bidirectional sync to Coda's Master | Main View Table via n8n webhooks. See [SUPA-CODA-TANGO.md](SUPA-CODA-TANGO.md) for the full sync architecture. Claude Code creates projects via voice dictation (`/new-project`), Coda serves as the visual editing layer. Previously in Teable and Baserow, both retired.
**Connects to**: People (who's working on what).

### 4. Business Contacts / CRM
**What**: People related to my business — categorized by role, relationship, context.
**Key data**: Name, company, role, how we met, interaction history, follow-up reminders.
**Where it lives today**: _TBD_
**Connects to**: People & Relationships, Project Management, Company Ideas.

### 5. Staying in Touch
**What**: People I want to maintain regular contact with.
**Key data**: Person, desired frequency, last contact date, notes on recent conversations, next action.
**Where it lives today**: _TBD_
**Connects to**: People & Relationships, Business Contacts.

### 6. Home Inventory
**What**: Tracking what I own, where it is, what it's worth.
**Key data**: Item, location (room/area), category, purchase date, cost, condition, photos.
**Where it lives today**: _TBD_
**Connects to**: Mostly standalone. Possible link to Buy/Gift Tracking.

### 7. Email Archiving
**What**: Archiving email from unused, legacy accounts before they disappear.
**Key data**: Account, sender/recipient, date, subject, body, attachments.
**Where it lives today**: Various old email accounts.
**Connects to**: People (senders/recipients map to the People table).

### 8. Airtable Migration
**What**: Moving all existing Airtable data to this system or to an archive.
**Key data**: Whatever's currently in Airtable — need to inventory this.
**Where it lives today**: Airtable.
**Connects to**: Depends on what's in there.

### 9. Buy / Gift Tracking
**What**: Things I want to buy for myself or give to others.
**Key data**: Item, who it's for (self or a person), price, priority, status (want / bought / given), occasion.
**Where it lives today**: _TBD_
**Connects to**: People (gift recipients).

### 10. Places to Go
**What**: Restaurants, trips, destinations, experiences.
**Key data**: Place, location, category (food, travel, experience), who recommended it, who I'd go with, status (want to / been).
**Where it lives today**: _TBD_
**Connects to**: People (who recommended, who to go with).

### 11. TV Shows to Watch
**What**: Tracking what I want to watch, am watching, or have watched.
**Key data**: Title, status (want to watch / watching / watched), rating, who recommended it, notes.
**Where it lives today**: _TBD_
**Connects to**: People (who recommended it). Mostly standalone.

### 12. Things to Do with My Son
**What**: Activities, places, experiences I want to do together.
**Key data**: Activity, category, status (want to / done), date done, age-appropriateness, notes, photos.
**Where it lives today**: _TBD_
**Connects to**: Places to Go (some overlap). Mostly standalone.

### 13. Company Ideas
**What**: Businesses I want to start or explore.
**Key data**: Name/concept, status (idea / researching / pursuing / shelved), notes, market size, related people, next steps.
**Where it lives today**: _TBD_
**Connects to**: People (potential collaborators, advisors), Project Management.

---

## Patterns

**People-centric projects** (relationships between people are the data):
- People & Relationships, Gatherings, Staying in Touch, Business Contacts/CRM

**People-connected projects** (people appear as a field, not the focus):
- Project Management, Buy/Gift Tracking, Places to Go, TV Shows, Company Ideas, Email Archiving

**Mostly standalone**:
- Home Inventory, Airtable Migration, Things with My Son

**Implications for the database choice**: The people-centric projects are a strong argument for a graph database (Neo4j) or at minimum a well-designed relationship model. Person-to-person connections with metadata (introduction date, context, mutual interest, gathering co-attendance) are exactly what graph databases excel at. The simpler projects could live happily in Postgres tables.

---

## Status summary

| Project | Status | View |
|---------|--------|------|
| People & Relationships | **Live** — Supabase + People v003 + Neo4j graph | `/people-v3` |
| Gatherings | Not started | — |
| Project Management | **Live** — Supabase + Coda (bidirectional sync via n8n) | Coda UI + Claude Code |
| Business Contacts / CRM | Not started | — |
| Staying in Touch | Not started | — |
| Home Inventory | Not started | — |
| Email Archiving | Not started | — |
| Airtable Migration | Not started | — |
| Buy / Gift Tracking | Not started | — |
| Places to Go | Not started | — |
| TV Shows to Watch | Not started | — |
| Things with My Son | Not started | — |
| Company Ideas | Not started | — |

Additionally, an **Inbox** capture system is live at `/` — not one of the original 13 projects but serves as a general-purpose ingestion point for URLs, text, and notes.

## Database architecture

The system uses a **hybrid Postgres + Neo4j** approach:

- **Supabase (Postgres)** — single source of truth for all entity data (people, projects, tasks, inbox). Normalized schema with UUID primary keys, status lookup tables, and passphrase-based record identification for voice-dictation workflows.
- **Neo4j** — graph layer for person-to-person relationships. Synced from Supabase via webhooks.
- **Coda** — visual editing layer for project management. Bidirectional sync with Supabase via n8n webhooks and a custom Coda Pack. Not a source of truth — just a convenient UI.
- **n8n** — workflow orchestrator running on Hetzner (178.156.235.239). Handles all webhook routing between Supabase, Coda, and Neo4j.

Previous platforms (Teable, Baserow) have been fully retired. All data now lives in Supabase.

## Open questions

- Is there existing data in Airtable that maps to any of these?
- How formal does the gathering/introduction tracking need to be? (Simple log vs. full CRM-style pipeline)
- Should "Staying in Touch" and "Business Contacts" be the same thing with different views?
- Should future table views all use the `GroupableTable` component, or do some datasets need different UI patterns?

---

*Last updated: 2026-04-07*
