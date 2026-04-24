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

export function Masonry({ images }: { images: MasonryImage[] }) {
  return (
    <div
      style={{
        columnCount: 4,
        columnGap: 12,
      }}
    >
      {images.map((img) => (
        <a
          key={img.id}
          href={img.public_url}
          target="_blank"
          rel="noreferrer"
          title={img.name}
          style={{
            display: "block",
            breakInside: "avoid",
            marginBottom: 12,
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
              onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
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
  );
}
