import { Pool } from "pg";
import { spawnSync } from "node:child_process";

const DATABASE_URL = process.env.DATABASE_URL_V002;
const API_BASE = "https://data.ifnotfor.com";
const CLAUDE = "/Users/tedpearlman/.local/bin/claude";
const LIMIT = Number(process.argv[2] || 10);

const SYSTEM =
  'Extract a concise project title (2-8 words, imperative when natural) and pick the best-fitting uber_project. uber_project MUST be exactly one of the allowed names. Respond with ONLY a raw JSON object, no markdown fences. Shape: {"title":"...","uber_project":"..."}';

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const uberList = await fetch(`${API_BASE}/api/projects/uber-list`).then((r) => r.json());
const uberNames = uberList.names.join(", ");

const notes = await pool.query(
  `SELECT id::text, title FROM inbox
   WHERE migrated_at IS NULL AND title !~* '^https?://'
   ORDER BY created_at DESC LIMIT $1`,
  [LIMIT],
);

console.log(`Processing ${notes.rows.length} notes (newest first)...`);

function stripFences(s) {
  return s.replace(/^```json\n?/i, "").replace(/^```\n?/, "").replace(/```$/, "").trim();
}

for (const [idx, row] of notes.rows.entries()) {
  const label = `[${idx + 1}/${notes.rows.length}]`;
  console.log(`${label} ${row.id}: ${row.title.slice(0, 90)}`);

  const prompt = `Sentence: ${row.title}\nAllowed uber_projects: ${uberNames}`;
  const res = spawnSync(
    CLAUDE,
    [
      "-p",
      prompt,
      "--model", "haiku",
      "--output-format", "json",
      "--tools", "",
      "--no-session-persistence",
      "--system-prompt", SYSTEM,
    ],
    { encoding: "utf8" },
  );

  if (res.status !== 0) {
    console.log(`    × claude exited ${res.status}: ${res.stderr?.slice(0, 200)}`);
    continue;
  }

  let parsed;
  try {
    const wrapper = JSON.parse(res.stdout);
    parsed = JSON.parse(stripFences(wrapper.result));
  } catch (e) {
    console.log(`    × parse failed: ${e.message}. raw: ${res.stdout.slice(0, 200)}`);
    continue;
  }

  const created = await fetch(`${API_BASE}/api/projects/quick-create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(parsed),
  }).then((r) => r.json());

  if (!created.success) {
    console.log(`    × create failed: ${JSON.stringify(created)}`);
    continue;
  }

  await pool.query(`UPDATE inbox SET migrated_at = now() WHERE id = $1`, [row.id]);
  console.log(`    → "${parsed.title}" [${parsed.uber_project}] project=${created.id} ✓ migrated`);
}

await pool.end();
console.log("Done.");
