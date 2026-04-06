export const dynamic = "force-dynamic";
export const metadata = { title: "People v001" };

import { getPeople } from "@/lib/db";
import { PeopleTable } from "./people-table";


export default async function PeoplePage() {
  const { rows } = await getPeople();
  return <PeopleTable people={rows} />;
}
