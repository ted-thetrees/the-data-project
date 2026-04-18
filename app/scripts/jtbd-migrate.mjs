import pg from "pg";
import { readFileSync } from "node:fs";

// Parse .env.local manually
const envFile = readFileSync(
  "/Users/tedpearlman/Projects/the-data-project/app/.env.local",
  "utf8",
);
const env = {};
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL_V002,
  ssl: { rejectUnauthorized: false },
});

const SQL = `
CREATE TABLE IF NOT EXISTS jtbd_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text,
  sort_order integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jtbd_thinkers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text,
  sort_order integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jtbd_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text,
  sort_order integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jtbd_thinker_jobs (
  thinker_id uuid NOT NULL REFERENCES jtbd_thinkers(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jtbd_jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thinker_id, job_id)
);

CREATE TABLE IF NOT EXISTS jtbd_component_jobs (
  component_id uuid NOT NULL REFERENCES jtbd_components(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jtbd_jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (component_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_jtbd_thinker_jobs_job ON jtbd_thinker_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_jtbd_component_jobs_job ON jtbd_component_jobs(job_id);

ALTER PUBLICATION supabase_realtime ADD TABLE jtbd_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE jtbd_thinkers;
ALTER PUBLICATION supabase_realtime ADD TABLE jtbd_components;
ALTER PUBLICATION supabase_realtime ADD TABLE jtbd_thinker_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE jtbd_component_jobs;
`;

const JOBS = [
  ["feel connected", "#3e8255"],
  ["feel nostalgic", "#8a5cd6"],
  ["feel like a good person", "#c96442"],
  ["feel like making a contribution", "#2563eb"],
  ["feel oriented", "#6e6d68"],
  ["feel joy", "#d4a72c"],
  ["feel surprise & delight", "#e85d75"],
];

const THINKERS = [
  "Robert Cialdini",
  "Abraham Maslow",
  "Rory Sutherland",
  "Ray Oldenburg",
  "Richard Thaler",
];

async function main() {
  const client = await pool.connect();
  try {
    console.log("Running schema DDL...");
    // Split on statement boundary; run each individually because ALTER PUBLICATION
    // will throw if the table is already in the publication, and we want to
    // tolerate that.
    for (const stmt of SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
      try {
        await client.query(stmt);
      } catch (err) {
        if (err.code === "42710" || err.message.includes("already")) {
          console.log(`  skip: ${err.message.split("\n")[0]}`);
        } else {
          throw err;
        }
      }
    }

    console.log("Seeding jobs...");
    for (let i = 0; i < JOBS.length; i++) {
      const [name, color] = JOBS[i];
      await client.query(
        `INSERT INTO jtbd_jobs (name, color, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, color, i * 10],
      );
    }

    console.log("Seeding thinkers...");
    for (let i = 0; i < THINKERS.length; i++) {
      await client.query(
        `INSERT INTO jtbd_thinkers (name, sort_order)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [THINKERS[i], i * 10],
      );
    }

    const { rows: jobs } = await client.query(
      "SELECT id, name FROM jtbd_jobs ORDER BY sort_order",
    );
    const { rows: thinkers } = await client.query(
      "SELECT id, name FROM jtbd_thinkers ORDER BY sort_order",
    );
    console.log(
      `Done. ${thinkers.length} thinkers, ${jobs.length} jobs.`,
    );
    console.log("Thinkers:", thinkers.map((t) => t.name).join(", "));
    console.log("Jobs:", jobs.map((j) => j.name).join(", "));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
