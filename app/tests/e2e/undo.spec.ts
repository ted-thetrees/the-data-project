import { test, expect, type Page } from "@playwright/test";
import pg from "pg";

// These tests mutate the real DB. Each test creates rows with a UNDO_E2E_
// prefix and cleans up after itself (even on failure) via the pg client
// below so stray data can't leak into the grids.

const MARKER = "UNDO_E2E_";
let pool: pg.Pool;

test.beforeAll(async () => {
  const connectionString = process.env.DATABASE_URL_V002;
  if (!connectionString) {
    throw new Error("DATABASE_URL_V002 must be set for e2e tests");
  }
  pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
});

test.afterAll(async () => {
  if (!pool) return;
  // Sweep anything left behind.
  await pool.query(`DELETE FROM backlog WHERE main_entry LIKE $1`, [MARKER + "%"]);
  await pool.query(`DELETE FROM audit.record_version WHERE record->>'main_entry' LIKE $1`, [MARKER + "%"]);
  await pool.end();
});

async function pressCmdZ(page: Page) {
  const isMac = process.platform === "darwin";
  await page.keyboard.press(isMac ? "Meta+z" : "Control+z");
}

test("⌘Z reverts a committed cell edit", async ({ page }) => {
  const initial = `${MARKER}initial_${Date.now()}`;
  const edited = `${MARKER}edited_${Date.now()}`;

  // Seed a row directly via DB so we don't rely on + New clicking correctly.
  const { rows } = await pool.query(
    `INSERT INTO backlog (main_entry) VALUES ($1) RETURNING id`,
    [initial],
  );
  const rowId = rows[0].id as number;

  try {
    await page.goto("/backlog");
    await page.waitForLoadState("networkidle");

    // Find the input whose current value is `initial`.
    const input = page.locator(`input[value="${initial}"]`).first();
    await expect(input).toBeVisible();

    // Edit the cell: click to focus, select all, type the new value, Tab to blur.
    await input.click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
    await page.keyboard.type(edited);
    await page.keyboard.press("Tab");

    // Wait for the edit to land (the server action fires on blur).
    await expect(page.locator(`input[value="${edited}"]`)).toBeVisible({ timeout: 5_000 });

    // Confirm the DB has the edited value.
    const after = await pool.query(`SELECT main_entry FROM backlog WHERE id=$1`, [rowId]);
    expect(after.rows[0].main_entry).toBe(edited);

    // Undo via keyboard.
    await page.locator("body").focus();
    await pressCmdZ(page);

    // Expect toast to appear briefly.
    await expect(page.getByTestId("undo-toast")).toContainText(/Undid/i, { timeout: 5_000 });

    // Expect the DB to be reverted.
    await expect.poll(
      async () => (await pool.query(`SELECT main_entry FROM backlog WHERE id=$1`, [rowId])).rows[0]?.main_entry,
      { timeout: 5_000, intervals: [250] },
    ).toBe(initial);
  } finally {
    await pool.query(`DELETE FROM backlog WHERE id=$1`, [rowId]);
    await pool.query(`DELETE FROM audit.record_version WHERE record_id=$1 AND table_name='backlog'`, [String(rowId)]);
  }
});

// NOTE: we deliberately don't test "⌘Z on empty log" as an e2e — that would
// require draining the audit log, which would undo real user edits. The
// SQL-level test suite covers it.
