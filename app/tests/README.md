# Tests

Two suites. Both run against the **live v002 Supabase** database (no test DB
exists), so each test is responsible for cleaning up what it creates.

## SQL-level tests — `tests/undo.test.mjs`

Exercises the audit trigger and `audit.undo_last()` function directly via
`pg`. Each test uses its own connection (and therefore its own txid) so
scenarios involving separate user actions are isolated.

```bash
pnpm test:undo
```

~4 seconds. Safe to run any time; every test scrubs its own rows and audit
entries on teardown.

## Browser-level tests — `tests/e2e/`

Playwright. Boots (or reuses) the Next.js dev server at `localhost:3000`
and drives Chromium.

```bash
pnpm dev                      # in one terminal (Playwright reuses it)
pnpm exec playwright install  # once, to fetch Chromium
pnpm test:e2e
```

**Cautions**:

- These mutate the real DB. Rows are tagged with a `UNDO_E2E_` prefix and
  swept in `afterAll`, but if a test is killed mid-run you may need to
  clean up manually:
  ```sql
  DELETE FROM backlog WHERE main_entry LIKE 'UNDO_E2E_%';
  ```
- `⌘Z` reverses **the most recent mutation in the DB globally**. Don't run
  e2e tests while you (or another tab / device) are editing live data —
  the undo may clobber your edit instead of the test's.
- To run against a non-local URL (e.g. a preview deploy) set
  `TEST_BASE_URL=https://…` and Playwright will skip booting a local dev
  server.
