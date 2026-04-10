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

function Empty() {
  return <span className="text-zinc-300">—</span>;
}

function WebLink({ url }: { url: string | null }) {
  if (!url) return <Empty />;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline text-sm truncate block"
      title={url}
    >
      {url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
    </a>
  );
}

function AreaTags({ areas }: { areas: string | null }) {
  if (!areas) return <Empty />;
  return (
    <div className="flex gap-1 flex-wrap">
      {areas.split(", ").map((area) => (
        <span
          key={area}
          className="inline-block px-1.5 py-0.5 rounded text-xs bg-zinc-100 text-zinc-600"
        >
          {area}
        </span>
      ))}
    </div>
  );
}

const columns: Column<Row>[] = [
  { key: "name", header: "Resource", width: 220 },
  {
    key: "overall_rating",
    header: "Overall Rating",
    width: 130,
    render: (row) => {
      if (!row.overall_rating) return <Empty />;
      return (
        <span className="text-sm text-white leading-snug">
          {row.overall_rating}
        </span>
      );
    },
  },
  {
    key: "website",
    header: "Website",
    width: 200,
    render: (row) => <WebLink url={row.website} />,
  },
  {
    key: "instagram",
    header: "Instagram",
    width: 180,
    render: (row) => <WebLink url={row.instagram} />,
  },
  {
    key: "areas",
    header: "Areas",
    width: 160,
    render: (row) => <AreaTags areas={row.areas} />,
  },
  {
    key: "notes",
    header: "Notes",
    width: 200,
    render: (row) =>
      row.notes ? (
        <span className="text-zinc-500 truncate block" title={row.notes}>
          {row.notes}
        </span>
      ) : (
        <Empty />
      ),
  },
];

export default async function ArchitecturePage() {
  const data = await getData();

  return (
    <PageShell title="Architecture" count={data.length} maxWidth="">
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        Places &middot; Architecture &middot; sorted by Rating
      </p>
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        fixedLayout
        ratingColumn="overall_rating"
        ratingColors={RATING_BG}
      />
    </PageShell>
  );
}
