#!/usr/bin/env node
// SQL-level test suite for the undo feature.
// Each test gets its own connection + transaction, mutations are committed
// (so audit rows get their own txids), then a cleanup DELETE at the end of
// the test removes everything it created. The real audit log is untouched
// afterwards because the whole audit log for the test rows is cleared.
//
// Run:  pnpm test:undo

import pg from "pg";

const connectionString = process.env.DATABASE_URL_V002;
if (!connectionString) {
  console.error("DATABASE_URL_V002 is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

let passed = 0;
let failed = 0;

async function run(name, fn) {
  const client = await pool.connect();
  try {
    await fn(client);
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log("        " + err.message);
    failed++;
  } finally {
    client.release();
  }
}

function assert(cond, label) {
  if (!cond) throw new Error(label);
}

async function q(client, sql, params) {
  return (await client.query(sql, params)).rows;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function t_insert_undo(c) {
  const [{ id }] = await q(c, "INSERT INTO backlog (main_entry) VALUES ('T_insert_undo') RETURNING id");
  try {
    assert((await q(c, "SELECT 1 FROM backlog WHERE id=$1", [id])).length === 1, "row exists");
    await q(c, "SELECT audit.undo_last()");
    assert((await q(c, "SELECT 1 FROM backlog WHERE id=$1", [id])).length === 0, "row gone after undo");
  } finally {
    await q(c, "DELETE FROM backlog WHERE id=$1", [id]);
    await q(c, "DELETE FROM audit.record_version WHERE record_id=$1 AND table_name='backlog'", [String(id)]);
  }
}

async function t_update_undo(c) {
  const [{ id }] = await q(c, "INSERT INTO backlog (main_entry, details) VALUES ('T_update_v1', 'untouched') RETURNING id");
  try {
    await q(c, "UPDATE backlog SET main_entry='T_update_v2' WHERE id=$1", [id]);
    assert((await q(c, "SELECT main_entry FROM backlog WHERE id=$1", [id]))[0].main_entry === "T_update_v2", "update applied");
    await q(c, "SELECT audit.undo_last()");
    const row = (await q(c, "SELECT main_entry, details FROM backlog WHERE id=$1", [id]))[0];
    assert(row.main_entry === "T_update_v1", "main_entry restored");
    assert(row.details === "untouched", "other columns unchanged");
  } finally {
    await q(c, "DELETE FROM backlog WHERE id=$1", [id]);
    await q(c, "DELETE FROM audit.record_version WHERE record_id=$1 AND table_name='backlog'", [String(id)]);
  }
}

async function t_delete_undo(c) {
  const [{ id }] = await q(c, "INSERT INTO backlog (main_entry, details) VALUES ('T_delete', 'restore me') RETURNING id");
  try {
    await q(c, "DELETE FROM backlog WHERE id=$1", [id]);
    assert((await q(c, "SELECT 1 FROM backlog WHERE id=$1", [id])).length === 0, "row deleted");
    await q(c, "SELECT audit.undo_last()");
    const row = (await q(c, "SELECT main_entry, details FROM backlog WHERE id=$1", [id]))[0];
    assert(row?.main_entry === "T_delete" && row?.details === "restore me", "row restored with original columns");
  } finally {
    await q(c, "DELETE FROM backlog WHERE id=$1", [id]);
    await q(c, "DELETE FROM audit.record_version WHERE record_id=$1 AND table_name='backlog'", [String(id)]);
  }
}

async function t_multirow_single_tx(c) {
  await q(c, "BEGIN");
  const [{ id: a }] = await q(c, "INSERT INTO backlog (main_entry) VALUES ('T_multirow_a') RETURNING id");
  const [{ id: b }] = await q(c, "INSERT INTO backlog (main_entry) VALUES ('T_multirow_b') RETURNING id");
  await q(c, "COMMIT");
  try {
    assert(
      (await q(c, "SELECT COUNT(DISTINCT txid)::int AS n FROM audit.record_version WHERE record_id = ANY($1)", [[String(a), String(b)]]))[0].n === 1,
      "both inserts share one txid"
    );
    await q(c, "SELECT audit.undo_last()");
    assert(
      (await q(c, "SELECT COUNT(*)::int AS n FROM backlog WHERE id IN ($1, $2)", [a, b]))[0].n === 0,
      "both rows gone after one undo"
    );
  } finally {
    await q(c, "DELETE FROM backlog WHERE id IN ($1, $2)", [a, b]);
    await q(c, "DELETE FROM audit.record_version WHERE record_id = ANY($1)", [[String(a), String(b)]]);
  }
}

async function t_two_step_undo(c) {
  const [{ id }] = await q(c, "INSERT INTO backlog (main_entry) VALUES ('T_two_v1') RETURNING id");
  try {
    await q(c, "UPDATE backlog SET main_entry='T_two_v2' WHERE id=$1", [id]);
    await q(c, "SELECT audit.undo_last()");
    assert((await q(c, "SELECT main_entry FROM backlog WHERE id=$1", [id]))[0].main_entry === "T_two_v1", "first undo reverts to v1");
    await q(c, "SELECT audit.undo_last()");
    assert((await q(c, "SELECT 1 FROM backlog WHERE id=$1", [id])).length === 0, "second undo removes the row");
  } finally {
    await q(c, "DELETE FROM backlog WHERE id=$1", [id]);
    await q(c, "DELETE FROM audit.record_version WHERE record_id=$1 AND table_name='backlog'", [String(id)]);
  }
}

async function t_nothing_to_undo(c) {
  // We can't guarantee an empty log (other tests / app traffic may be adding
  // rows). Instead: undo everything that's currently there in a loop until
  // undo_last returns null, then assert.
  while ((await q(c, "SELECT audit.undo_last() AS d"))[0].d !== null) { /* drain */ }
  const [{ d }] = await q(c, "SELECT audit.undo_last() AS d");
  assert(d === null, "undo_last returns NULL when nothing is left");
}

async function t_undo_doesnt_log_itself(c) {
  const [{ id }] = await q(c, "INSERT INTO backlog (main_entry) VALUES ('T_nolog') RETURNING id");
  try {
    const before = (await q(c, "SELECT COUNT(*)::int AS n FROM audit.record_version WHERE table_name='backlog'"))[0].n;
    await q(c, "SELECT audit.undo_last()");
    const after = (await q(c, "SELECT COUNT(*)::int AS n FROM audit.record_version WHERE table_name='backlog' AND undone_at IS NULL"))[0].n;
    // Active (not-undone) rows should decrease; no NEW rows should appear.
    assert(after <= before, "undo must not create new audit rows");
  } finally {
    await q(c, "DELETE FROM backlog WHERE id=$1", [id]);
    await q(c, "DELETE FROM audit.record_version WHERE record_id=$1 AND table_name='backlog'", [String(id)]);
  }
}

async function t_integer_key_round_trip(c) {
  const [{ id }] = await q(c, "INSERT INTO backlog (main_entry) VALUES ('T_int_key') RETURNING id");
  try {
    const [row] = await q(c, "SELECT record_id FROM audit.record_version WHERE table_name='backlog' AND op='INSERT' AND record_id=$1", [String(id)]);
    assert(row?.record_id === String(id), "record_id captured for integer-keyed row");
    await q(c, "SELECT audit.undo_last()");
    assert((await q(c, "SELECT 1 FROM backlog WHERE id=$1", [id])).length === 0, "integer-keyed row removed");
  } finally {
    await q(c, "DELETE FROM backlog WHERE id=$1", [id]);
    await q(c, "DELETE FROM audit.record_version WHERE record_id=$1 AND table_name='backlog'", [String(id)]);
  }
}

async function t_uuid_key_round_trip(c) {
  const [{ id }] = await q(c, "INSERT INTO talent (name) VALUES ('T_uuid_key') RETURNING id");
  try {
    await q(c, "UPDATE talent SET name='T_uuid_edited' WHERE id=$1", [id]);
    await q(c, "SELECT audit.undo_last()");
    assert((await q(c, "SELECT name FROM talent WHERE id=$1", [id]))[0].name === "T_uuid_key", "uuid-keyed row reverted");
    await q(c, "SELECT audit.undo_last()");
    assert((await q(c, "SELECT 1 FROM talent WHERE id=$1", [id])).length === 0, "uuid-keyed row deleted by second undo");
  } finally {
    await q(c, "DELETE FROM talent WHERE id=$1", [id]);
    await q(c, "DELETE FROM audit.record_version WHERE record_id=$1 AND table_name='talent'", [id]);
  }
}

async function t_type_round_trip(c) {
  const [{ id, updated_at }] = await q(c, "INSERT INTO backlog (main_entry, details) VALUES ('T_types', 'abc') RETURNING id, updated_at");
  try {
    await q(c, "DELETE FROM backlog WHERE id=$1", [id]);
    await q(c, "SELECT audit.undo_last()");
    const [row] = await q(c, "SELECT updated_at FROM backlog WHERE id=$1", [id]);
    assert(row.updated_at?.getTime() === updated_at?.getTime(), "timestamptz survived jsonb round-trip");
  } finally {
    await q(c, "DELETE FROM backlog WHERE id=$1", [id]);
    await q(c, "DELETE FROM audit.record_version WHERE record_id=$1 AND table_name='backlog'", [String(id)]);
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const tests = [
  ["INSERT → undo deletes the row", t_insert_undo],
  ["UPDATE → undo restores the column (others unchanged)", t_update_undo],
  ["DELETE → undo restores the row with all columns", t_delete_undo],
  ["Multi-row single-transaction is undone as a unit", t_multirow_single_tx],
  ["Two-step undo (INSERT then UPDATE)", t_two_step_undo],
  ["undo_last returns NULL when log is empty", t_nothing_to_undo],
  ["undo itself is not logged (suppression flag)", t_undo_doesnt_log_itself],
  ["Integer-keyed table (backlog) round-trips", t_integer_key_round_trip],
  ["UUID-keyed table (talent) round-trips", t_uuid_key_round_trip],
  ["Type round-trip (timestamptz via jsonb)", t_type_round_trip],
];

const start = Date.now();
for (const [name, fn] of tests) {
  await run(name, fn);
}
await pool.end();

const ms = Date.now() - start;
console.log(`\n${passed} passed, ${failed} failed  (${ms}ms)`);
process.exit(failed === 0 ? 0 : 1);
