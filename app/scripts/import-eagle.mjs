// Import Eagle library into Supabase Storage + Postgres.
//
// Reads /Users/tedpearlman/Eagle/Everything.library/images/*.info/metadata.json
// Uploads each (non-deleted) original to bucket "eagle-images"
// Upserts rows into eagle_images, eagle_folders, eagle_image_folders, eagle_tags, eagle_image_tags
//
// Idempotent on eagle_id — re-runs skip already-uploaded items.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-eagle.mjs [--limit N] [--include-videos] [--dry-run]

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

const LIBRARY = "/Users/tedpearlman/Eagle/Everything.library";
const BUCKET = "eagle-images";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL_V002;

const VIDEO_EXTS = new Set(["mp4", "mov", "webm", "m4v", "mkv"]);
const SKIP_EXTS = new Set(["url"]); // bookmarks, no actual image

const args = process.argv.slice(2);
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? Number(args[i + 1]) : Infinity;
})();
const INCLUDE_VIDEOS = args.includes("--include-videos");
const DRY_RUN = args.includes("--dry-run");

if (!SUPABASE_URL || !SERVICE_KEY || !DATABASE_URL) {
  console.error("missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL_V002");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const pool = new Pool({ connectionString: DATABASE_URL });
// Swallow the "idle client ETIMEDOUT" that Supabase's transaction pooler
// emits after pool.end() — it's a cosmetic cleanup race, not a real failure.
pool.on("error", () => {});

// ---------- Folder sync (via Eagle API; falls back if Eagle not running) ----------
async function syncFolders() {
  let folders;
  try {
    const r = await fetch("http://localhost:41595/api/folder/list");
    const j = await r.json();
    folders = j.data;
  } catch {
    console.log("Eagle API not reachable — skipping folder tree sync (rows will still link to folder IDs).");
    return new Map();
  }

  const byId = new Map();
  function walk(arr, parentId, prefix) {
    for (const f of arr) {
      const fullPath = `${prefix}/${f.name}`;
      byId.set(f.id, { id: f.id, name: f.name, parent_id: parentId, full_path: fullPath, color: f.color || null, sort_order: null });
      if (f.children?.length) walk(f.children, f.id, fullPath);
    }
  }
  walk(folders, null, "");

  if (DRY_RUN) {
    console.log(`would sync ${byId.size} folders`);
    return byId;
  }

  // Upsert folders in two passes so parent_id always exists when child is inserted.
  // Roots first, then children breadth-first.
  const ordered = [];
  const seen = new Set();
  function emit(id) {
    if (seen.has(id)) return;
    const f = byId.get(id);
    if (!f) return;
    if (f.parent_id) emit(f.parent_id);
    seen.add(id);
    ordered.push(f);
  }
  for (const id of byId.keys()) emit(id);

  const client = await pool.connect();
  try {
    for (const f of ordered) {
      await client.query(
        `INSERT INTO eagle_folders (id, name, parent_id, full_path, color, sort_order, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,now())
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, full_path=EXCLUDED.full_path, color=EXCLUDED.color, updated_at=now()`,
        [f.id, f.name, f.parent_id, f.full_path, f.color, f.sort_order],
      );
    }
  } finally {
    client.release();
  }
  console.log(`synced ${ordered.length} folders`);
  return byId;
}

// ---------- Item walk ----------
async function listItemDirs() {
  const entries = await readdir(join(LIBRARY, "images"));
  return entries.filter((e) => e.endsWith(".info"));
}

async function readMeta(dir) {
  const raw = await readFile(join(LIBRARY, "images", dir, "metadata.json"), "utf8");
  return JSON.parse(raw);
}

function originalFilename(meta) {
  return `${meta.name}.${meta.ext}`;
}

function contentTypeFor(ext) {
  const map = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    gif: "image/gif", svg: "image/svg+xml", avif: "image/avif", heic: "image/heic", bmp: "image/bmp",
    mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", m4v: "video/x-m4v", mkv: "video/x-matroska",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}

// ---------- Tag handling ----------
const tagIdCache = new Map();
async function ensureTag(client, name) {
  if (tagIdCache.has(name)) return tagIdCache.get(name);
  const ins = await client.query(
    `INSERT INTO eagle_tags (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [name],
  );
  const id = ins.rows[0].id;
  tagIdCache.set(name, id);
  return id;
}

// ---------- Per-item ----------
async function importOne(meta, dir) {
  if (meta.isDeleted) return { skipped: "deleted" };
  const ext = (meta.ext || "").toLowerCase();
  if (SKIP_EXTS.has(ext)) return { skipped: `ext:${ext}` };
  if (!INCLUDE_VIDEOS && VIDEO_EXTS.has(ext)) return { skipped: "video" };

  const filename = originalFilename(meta);
  const localPath = join(LIBRARY, "images", dir, filename);
  let fileStat;
  try {
    fileStat = await stat(localPath);
  } catch {
    return { skipped: "missing-file" };
  }

  const client = await pool.connect();
  try {
    // already imported?
    const existing = await client.query(
      `SELECT id, public_url FROM eagle_images WHERE eagle_id = $1`,
      [meta.id],
    );
    let imageRowId, publicUrl, storagePath;

    if (existing.rows.length) {
      imageRowId = existing.rows[0].id;
      publicUrl = existing.rows[0].public_url;
    } else {
      // upload to storage — keep the key simple/safe: eagle_id + ext
      storagePath = `${meta.id}.${ext}`;
      if (!DRY_RUN) {
        const bytes = await readFile(localPath);
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, bytes, {
            contentType: contentTypeFor(ext),
            upsert: true,
          });
        if (upErr) throw new Error(`upload: ${upErr.message}`);
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        publicUrl = pub.publicUrl;
      } else {
        publicUrl = `https://dry-run/${storagePath}`;
      }

      const ins = await client.query(
        `INSERT INTO eagle_images
          (eagle_id, name, ext, width, height, file_size_bytes, eagle_modification_time, storage_path, public_url, is_video, added_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), now())
         RETURNING id`,
        [
          meta.id,
          meta.name,
          ext,
          meta.width || null,
          meta.height || null,
          fileStat.size,
          meta.modificationTime || meta.mtime || null,
          storagePath,
          publicUrl,
          VIDEO_EXTS.has(ext),
        ],
      );
      imageRowId = ins.rows[0].id;
    }

    // sync folder memberships (replace)
    if (!DRY_RUN) {
      await client.query(`DELETE FROM eagle_image_folders WHERE image_id = $1`, [imageRowId]);
      for (const fid of meta.folders || []) {
        await client.query(
          `INSERT INTO eagle_image_folders (image_id, folder_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [imageRowId, fid],
        );
      }
      // sync tag memberships (replace)
      await client.query(`DELETE FROM eagle_image_tags WHERE image_id = $1`, [imageRowId]);
      for (const tagName of meta.tags || []) {
        const tagId = await ensureTag(client, tagName);
        await client.query(
          `INSERT INTO eagle_image_tags (image_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [imageRowId, tagId],
        );
      }
    }

    return { ok: true, fresh: !existing.rows.length };
  } finally {
    client.release();
  }
}

// ---------- Main ----------
async function main() {
  console.log(`Eagle library: ${LIBRARY}`);
  console.log(`Bucket:        ${BUCKET}`);
  console.log(`Include videos: ${INCLUDE_VIDEOS}    Limit: ${LIMIT === Infinity ? "all" : LIMIT}    Dry run: ${DRY_RUN}`);

  await syncFolders();

  const dirs = await listItemDirs();
  console.log(`Found ${dirs.length} item dirs`);

  let ok = 0, fresh = 0, skipped = 0, failed = 0;
  const skipReasons = {};
  let n = 0;
  for (const dir of dirs) {
    if (n >= LIMIT) break;
    n++;
    let meta;
    try {
      meta = await readMeta(dir);
    } catch (e) {
      failed++;
      console.error(`[${n}] ${dir} read meta: ${e.message}`);
      continue;
    }
    try {
      const r = await importOne(meta, dir);
      if (r.skipped) {
        skipped++;
        skipReasons[r.skipped] = (skipReasons[r.skipped] || 0) + 1;
      } else {
        ok++;
        if (r.fresh) fresh++;
      }
    } catch (e) {
      failed++;
      console.error(`[${n}] ${dir} (${meta.name}.${meta.ext}): ${e.message}`);
    }
    if (n % 50 === 0) console.log(`  …${n}/${dirs.length}  ok=${ok} fresh=${fresh} skipped=${skipped} failed=${failed}`);
  }
  console.log(`\nDone. ok=${ok} (fresh=${fresh}) skipped=${skipped} failed=${failed}`);
  console.log(`Skip reasons:`, skipReasons);
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
