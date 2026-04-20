// Backfill cgtrader_items.image_url with the real og:image from each page.
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_V002,
  ssl: { rejectUnauthorized: false },
});

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function findOgImage(html) {
  const m1 = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );
  if (m1) return m1[1];
  const m2 = html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  );
  if (m2) return m2[1];
  return null;
}

const { rows } = await pool.query("SELECT id, url FROM cgtrader_items");
let updated = 0;
let failed = 0;
for (const r of rows) {
  try {
    const res = await fetch(r.url, {
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    const html = await res.text();
    const img = findOgImage(html);
    if (img) {
      await pool.query(
        "UPDATE cgtrader_items SET image_url = $1, updated_at = now() WHERE id = $2",
        [img, r.id],
      );
      updated++;
    } else {
      failed++;
      console.log("no og:image:", r.url);
    }
  } catch (e) {
    failed++;
    console.log("error", r.url, e.message);
  }
}
console.log(`updated=${updated} failed=${failed}`);
await pool.end();
