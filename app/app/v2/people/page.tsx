export const dynamic = "force-dynamic";
export const metadata = { title: "People v2 — MRT" };

import { getPeople } from "@/lib/db";
import { PeopleTable } from "./people-table";

export default async function PeopleV2Page() {
  const { rows } = await getPeople();
  return <PeopleTable people={rows} />;
}
