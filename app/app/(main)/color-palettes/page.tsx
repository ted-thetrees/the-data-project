import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";

export const metadata = { title: "Color Palettes" };
export const dynamic = "force-dynamic";

const COLOR_COLUMNS: readonly string[] = Array.from(
  { length: 15 },
  (_, i) => `color_${i + 1}`
);

type Palette = {
  id: string;
  name: string;
} & Record<string, string | null>;

async function getPalettes(): Promise<Palette[]> {
  const result = await poolV002.query(
    `SELECT id, name, ${COLOR_COLUMNS.join(", ")} FROM color_palettes ORDER BY created_at DESC`
  );
  return result.rows;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastTextColor(hex: string): "#000" | "#fff" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000";
  const L = relativeLuminance(rgb);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastBlack >= contrastWhite ? "#000" : "#fff";
}

function Swatch({ hex }: { hex: string | null }) {
  if (!hex) {
    return (
      <div
        className="h-16 flex items-center justify-center border border-border rounded-sm text-[10px] font-mono text-muted-foreground"
        style={{ backgroundColor: "#fff" }}
      >
        —
      </div>
    );
  }
  const textColor = contrastTextColor(hex);
  return (
    <div
      className="h-16 flex items-center justify-center rounded-sm text-xs font-mono"
      style={{ backgroundColor: hex, color: textColor }}
    >
      {hex.toLowerCase()}
    </div>
  );
}

export default async function ColorPalettesPage() {
  const palettes = await getPalettes();

  return (
    <PageShell title="Color Palettes" maxWidth="max-w-6xl">
      <div className="space-y-8">
        {palettes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No palettes yet.</p>
        ) : (
          palettes.map((p) => (
            <section key={p.id}>
              <h2 className="text-lg font-semibold mb-3">{p.name}</h2>
              <div className="overflow-x-auto">
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: "repeat(15, minmax(95px, 1fr))" }}
                >
                  {COLOR_COLUMNS.map((col) => (
                    <Swatch key={col} hex={p[col]} />
                  ))}
                </div>
              </div>
            </section>
          ))
        )}
      </div>
    </PageShell>
  );
}
