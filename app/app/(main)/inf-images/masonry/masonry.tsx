"use client";

export interface MasonryImage {
  id: string;
  eagle_id: string;
  name: string;
  width: number | null;
  height: number | null;
  public_url: string;
  is_video: boolean;
}

const COLUMN_COUNT = 4;
const COLUMN_GAP = 12;
const FALLBACK_ASPECT = 1; // square if width/height missing

/**
 * Greedy shortest-column placement: walk images in input order, place each into
 * the column whose current cumulative height is lowest. The result reads
 * left-to-right, top-to-bottom — i.e., visual order tracks input order by
 * vertical distance from the top of the layout.
 */
function distribute(images: MasonryImage[]): MasonryImage[][] {
  const columns: MasonryImage[][] = Array.from({ length: COLUMN_COUNT }, () => []);
  const heights = new Array(COLUMN_COUNT).fill(0);
  for (const img of images) {
    const aspect =
      img.width && img.height && img.width > 0
        ? img.height / img.width
        : FALLBACK_ASPECT;
    let target = 0;
    for (let i = 1; i < COLUMN_COUNT; i++) {
      if (heights[i] < heights[target]) target = i;
    }
    columns[target].push(img);
    heights[target] += aspect; // unitless; we only compare relative heights
  }
  return columns;
}

export function Masonry({ images }: { images: MasonryImage[] }) {
  const columns = distribute(images);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLUMN_COUNT}, 1fr)`,
        gap: COLUMN_GAP,
        alignItems: "start",
      }}
    >
      {columns.map((col, ci) => (
        <div
          key={ci}
          style={{ display: "flex", flexDirection: "column", gap: COLUMN_GAP }}
        >
          {col.map((img) => (
            <a
              key={img.id}
              href={img.public_url}
              target="_blank"
              rel="noreferrer"
              title={img.name}
              style={{
                display: "block",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                background: "var(--cell-bg)",
              }}
            >
              {img.is_video ? (
                <video
                  src={img.public_url}
                  style={{ width: "100%", height: "auto", display: "block" }}
                  muted
                  loop
                  preload="metadata"
                  onMouseEnter={(e) =>
                    (e.currentTarget as HTMLVideoElement).play()
                  }
                  onMouseLeave={(e) => {
                    const v = e.currentTarget as HTMLVideoElement;
                    v.pause();
                    v.currentTime = 0;
                  }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.public_url}
                  alt={img.name}
                  loading="lazy"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              )}
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}
