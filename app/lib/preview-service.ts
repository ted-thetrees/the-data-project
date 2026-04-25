import { revalidateTag } from "next/cache";
import { pool } from "@/lib/db";

const SERVICE_URL = process.env.SCREENSHOT_SERVICE_URL;
const SERVICE_SECRET = process.env.SCREENSHOT_SERVICE_SECRET;
const CAPTURE_TIMEOUT_MS = 50_000;

async function captureScreenshot(url: string): Promise<string | null> {
  if (!SERVICE_URL || !SERVICE_SECRET) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);
  try {
    const res = await fetch(`${SERVICE_URL.replace(/\/$/, "")}/capture`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${SERVICE_SECRET}`,
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return typeof data.url === "string" ? data.url : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function capturePreviewForInbox(
  recordId: string,
  url: string,
): Promise<void> {
  const imageUrl = await captureScreenshot(url);
  await pool.query(
    `UPDATE inbox
       SET preview_image_url = $1,
           preview_fetched_at = now()
     WHERE id = $2`,
    [imageUrl, recordId],
  );
  revalidateTag("inbox", "max");
}
