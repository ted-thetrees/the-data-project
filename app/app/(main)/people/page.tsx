import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PeopleTable, type PersonRow } from "./people-table";
import type { PillOption } from "@/components/pill";

export const metadata = { title: "People" };
export const dynamic = "force-dynamic";

async function getPeople(): Promise<PersonRow[]> {
  const result = await poolV002.query<PersonRow>(`
    SELECT
      p.id::text             AS id,
      p.name,
      p.known_as,
      p.passphrase,
      p.gender_id::text      AS gender_id,
      p.familiarity_id::text AS familiarity_id,
      p.teller_status_id::text AS teller_status_id,
      p.has_org_filled_id::text AS has_org_filled_id,
      p.metro_area_id::text  AS metro_area_id
    FROM people p
    ORDER BY p.name NULLS LAST
  `);
  return result.rows;
}

async function getLookupOptions(
  table: string,
  orderClause = "ORDER BY sort_order NULLS LAST, name",
): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT id::text AS id, name, color FROM ${table} ${orderClause}`,
  );
  return result.rows;
}

export default async function PeoplePage() {
  const [
    rows,
    genderOptions,
    familiarityOptions,
    tellerStatusOptions,
    orgFilledOptions,
    metroAreaOptions,
  ] = await Promise.all([
    getPeople(),
    getLookupOptions("people_genders"),
    getLookupOptions("people_familiarity_levels"),
    getLookupOptions("people_teller_statuses"),
    getLookupOptions("people_org_fill_statuses"),
    getLookupOptions("people_metro_areas"),
  ]);

  return (
    <PageShell title="People" count={rows.length} maxWidth="">
      <Realtime
        tables={[
          "people",
          "people_genders",
          "people_familiarity_levels",
          "people_teller_statuses",
          "people_org_fill_statuses",
          "people_metro_areas",
        ]}
      />
      <PeopleTable
        rows={rows}
        genderOptions={genderOptions}
        familiarityOptions={familiarityOptions}
        tellerStatusOptions={tellerStatusOptions}
        orgFilledOptions={orgFilledOptions}
        metroAreaOptions={metroAreaOptions}
      />
    </PageShell>
  );
}
