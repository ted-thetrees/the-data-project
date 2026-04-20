import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL_V002;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const PAGES = Number(process.argv[2] || 7);

if (!PEXELS_KEY) {
  console.error("PEXELS_API_KEY not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fetchPage(page) {
  const url = new URL(PEXELS_SEARCH);
  url.searchParams.set("query", "abstract background");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("size", "large");
  url.searchParams.set("per_page", "80");
  url.searchParams.set("page", String(page));
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.photos ?? []).map((p) => p.src?.landscape).filter(Boolean);
}

const pool_images = [];
for (let p = 1; p <= PAGES; p++) {
  const imgs = await fetchPage(p);
  pool_images.push(...imgs);
  console.log(`page ${p}: +${imgs.length} (total ${pool_images.length})`);
  if (imgs.length === 0) break;
}

const unique = [...new Set(pool_images)];
console.log(`Collected ${unique.length} unique abstract background URLs.`);

for (let i = unique.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [unique[i], unique[j]] = [unique[j], unique[i]];
}

const rows = (await pool.query(
  `SELECT id::text FROM inbox
   WHERE title !~* '^https?://' AND title !~* '^[a-z]+://'
   ORDER BY created_at DESC`,
)).rows;

console.log(`Assigning to ${rows.length} plaintext rows...`);

for (const [i, row] of rows.entries()) {
  const url = unique[i % unique.length];
  await pool.query(
    `UPDATE inbox SET preview_image_url = $1, preview_fetched_at = now() WHERE id = $2`,
    [url, row.id],
  );
}

await pool.end();
console.log(`Done. Assigned ${rows.length} rows from a pool of ${unique.length}.`);
