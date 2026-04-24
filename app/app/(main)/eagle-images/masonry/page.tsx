import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import { Masonry, type MasonryImage } from "./masonry";

export const metadata = { title: "Eagle Images — Masonry" };
export const dynamic = "force-dynamic";

async function getImages(): Promise<MasonryImage[]> {
  const r = await poolV002.query<MasonryImage>(`
    SELECT
      id::text         AS id,
      eagle_id,
      name,
      width,
      height,
      public_url,
      is_video
    FROM eagle_images
    ORDER BY added_at DESC
  `);
  return r.rows;
}

export default async function EagleMasonryPage() {
  const images = await getImages();
  return (
    <PageShell title="Eagle Images — Masonry" count={images.length} maxWidth="">
      <Realtime tables={["eagle_images"]} />
      <Subtitle>4-column masonry view of every imported Eagle image.</Subtitle>
      <Masonry images={images} />
    </PageShell>
  );
}
