import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { DataTable, type Column } from "@/components/data-table";
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import { Pill } from "@/components/pill";
import { Realtime } from "@/components/realtime";

export const metadata = { title: "Architecture" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  overall_rating: string | null;
  rating_color: string | null;
  website: string | null;
  instagram: string | null;
  areas: string | null;
  notes: string | null;
}

async function getData(): Promise<Row[]> {
  const result = await poolV002.query(`
    SELECT t.id, t.name, t.overall_rating, t.website, t.instagram, t.notes,
           trl.color as rating_color,
           string_agg(DISTINCT ta.name, ', ') as areas
    FROM talent t
    LEFT JOIN talent_area_links tal ON t.id = tal.talent_id
    LEFT JOIN talent_areas ta ON tal.area_id = ta.id
    LEFT JOIN talent_rating_levels trl ON t.overall_rating = trl.name
    WHERE t.primary_talent_category = 'Places'
      AND t.primary_talent = 'Architecture'
    GROUP BY t.id, trl.sort_order, trl.color
    ORDER BY trl.sort_order ASC NULLS LAST, t.name
  `);
  return result.rows;
}

function AreaTags({ areas }: { areas: string | null }) {
  if (!areas) return <Empty />;
  return (
    <div className="flex gap-1 flex-wrap">
      {areas.split(", ").map((area) => (
        <span
          key={area}
          className="inline-block px-1.5 py-0.5 rounded"
          style={{
            fontSize: "var(--font-size-xs)",
            backgroundColor: "var(--tag-bg)",
            color: "var(--tag-text)",
          }}
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
    width: 175,
    render: (row) => {
      if (!row.overall_rating) return <Empty />;
      return <Pill color={row.rating_color}>{row.overall_rating}</Pill>;
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
        <span className="truncate block text-muted-foreground" title={row.notes}>
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
      <Realtime
        tables={[
          "talent",
          "talent_area_links",
          "talent_areas",
          "talent_rating_levels",
        ]}
      />
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        Places &middot; Architecture &middot; sorted by Rating
      </p>
      <DataTable columns={columns} rows={data} rowKey={(r) => r.id} fixedLayout />
    </PageShell>
  );
}
