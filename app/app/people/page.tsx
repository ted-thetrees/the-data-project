export const dynamic = "force-dynamic";
export const metadata = { title: "People v001" };

import { getPeople } from "@/lib/db";
import { PeopleTable } from "./people-table";
import "../projects-v5/theme.css";

export default async function PeoplePage() {
  const people = await getPeople();
  return <PeopleTable people={people} />;
}
