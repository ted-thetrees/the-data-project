export const dynamic = "force-dynamic";
export const metadata = { title: "People v003" };

import { getPeople } from "@/lib/db";
import { PeopleTable } from "./people-table";
import "../projects-v5/theme.css";

export interface PersonRow {
  id: string;
  name: string;
  image: string | null;
  familiarity: string | null;
  gender: string | null;
  known_as: string | null;
  metro_area: string | null;
  has_org_filled: string | null;
  target_desirability: string | null;
  teller_status: string | null;
}

export default async function PeopleV3Page() {
  const people = (await getPeople()) as PersonRow[];
  return <PeopleTable data={people} />;
}
