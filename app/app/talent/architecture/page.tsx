import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { DataTable, type Column } from "@/components/data-table";

export const metadata = { title: "Architecture" };
export const dynamic = "force-dynamic";

const RATING_BG: Record<string, string> = {
  "Absolute Top": "hsl(140, 35%, 38%)",
  "Probably Absolute Top": "hsl(170, 30%, 38%)",
  "Contenders to (Re)Mull": "hsl(270, 25%, 42%)",
  "Other": "hsl(0, 0%, 45%)",
  "Rejects": "hsl(0, 35%, 40%)",
};

interface Row {
  id: string;
  name: string;
  overall_rating: string | null;
  website: string | null;
  instagram: string | null;
  areas: string | null;
  notes: string | null;
}

async function getData(): Promise<Row[]> {
  const result = await poolV002.query(`
    SELECT t.id, t.name, t.overall_rating, t.website, t.instagram, t.notes,
           string_agg(DISTINCT ta.name, ', ') as areas
    FROM talent t
    LEFT JOIN talent_area_links tal ON t.id = tal.talent_id
    LEFT JOIN talent_areas ta ON tal.area_id = ta.id
    LEFT JOIN talent_rating_levels trl ON t.overall_rating = trl.name
    WHERE t.primary_talent_category = 'Places'
      AND t.primary_talent = 'Architecture'
    GROUP BY t.id, trl.sort_order
    ORDER BY trl.sort_order ASC NULLS LAST, t.name
  `);
  return result.rows;
}

function RatingCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const bg = RATING_BG[value] || "hsl(0, 0%, 45%)";
  return (
    <span
      className="inline-block px-2.5 py-1 rounded text-xs font-medium text-white"
      style={{ backgroundColor: bg }}
    >
      {value}
    </span>
  );
}

function WebLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline text-sm truncate block max-w-[200px]"
      title={url}
    >
      {url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
    </a>
  );
}

function AreaTags({ areas }: { areas: string | null }) {
  if (!areas) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {areas.split(", ").map((area) => (
        <span
          key={area}
          className="inline-block px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground"
        >
          {area}
        </span>
      ))}
    </div>
  );
}

const columns: Column<Row>[] = [
  { key: "name", header: "Name" },
  {
    key: "overall_rating",
    header: "Rating",
    render: (row) => <RatingCell value={row.overall_rating} />,
  },
  {
    key: "website",
    header: "Website",
    render: (row) => <WebLink url={row.website} />,
  },
  {
    key: "instagram",
    header: "Instagram",
    render: (row) => <WebLink url={row.instagram} />,
  },
  {
    key: "areas",
    header: "Areas",
    render: (row) => <AreaTags areas={row.areas} />,
  },
  {
    key: "notes",
    header: "Notes",
    render: (row) =>
      row.notes ? (
        <span className="text-muted-foreground truncate block max-w-[200px]" title={row.notes}>
          {row.notes}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export default async function ArchitecturePage() {
  const data = await getData();

  return (
    <PageShell title="Architecture" count={data.length}>
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        Places &middot; Architecture &middot; sorted by Rating
      </p>
      <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
    </PageShell>
  );
}
