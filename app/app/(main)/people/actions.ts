"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidatePeoplePage() {
  revalidatePath("/people");
}

function parseLookupId(v: string): number | null {
  return v ? Number(v) : null;
}

export async function updatePersonName(id: string, name: string) {
  await poolV002.query(
    `UPDATE people SET name = $1, updated_at = now() WHERE id = $2`,
    [name || "Untitled", id],
  );
  revalidatePeoplePage();
}

export async function updatePersonKnownAs(id: string, knownAs: string) {
  await poolV002.query(
    `UPDATE people SET known_as = $1, updated_at = now() WHERE id = $2`,
    [knownAs || null, id],
  );
  revalidatePeoplePage();
}

export async function updatePersonPassphrase(id: string, passphrase: string) {
  await poolV002.query(
    `UPDATE people SET passphrase = $1, updated_at = now() WHERE id = $2`,
    [passphrase || null, id],
  );
  revalidatePeoplePage();
}

export async function updatePersonGender(id: string, genderId: string) {
  await poolV002.query(
    `UPDATE people SET gender_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(genderId), id],
  );
  revalidatePeoplePage();
}

export async function updatePersonFamiliarity(id: string, familiarityId: string) {
  await poolV002.query(
    `UPDATE people SET familiarity_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(familiarityId), id],
  );
  revalidatePeoplePage();
}

export async function updatePersonTellerStatus(id: string, tellerStatusId: string) {
  await poolV002.query(
    `UPDATE people SET teller_status_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(tellerStatusId), id],
  );
  revalidatePeoplePage();
}

export async function updatePersonOrgFilled(id: string, orgFilledId: string) {
  await poolV002.query(
    `UPDATE people SET has_org_filled_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(orgFilledId), id],
  );
  revalidatePeoplePage();
}

export async function updatePersonMetroArea(id: string, metroAreaId: string) {
  await poolV002.query(
    `UPDATE people SET metro_area_id = $1, updated_at = now() WHERE id = $2`,
    [parseLookupId(metroAreaId), id],
  );
  revalidatePeoplePage();
}

export async function createPerson() {
  await poolV002.query(
    `INSERT INTO people (name, sort_order)
     VALUES ('Untitled', (SELECT COALESCE(MIN(sort_order), 0) - 1 FROM people))`,
  );
  revalidatePeoplePage();
}

export async function reorderPeopleRows(orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const values = orderedIds.map((_, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::int)`).join(",");
  const params: (string | number)[] = [];
  orderedIds.forEach((id, i) => {
    params.push(id, i);
  });
  await poolV002.query(
    `UPDATE people p SET sort_order = v.sort_order
     FROM (VALUES ${values}) AS v(id, sort_order)
     WHERE p.id = v.id`,
    params,
  );
  revalidatePeoplePage();
}

export async function createPersonInGroup(prefill: Record<string, string | null>) {
  const allowed: Record<string, string> = {
    gender_id: "gender_id",
    familiarity_id: "familiarity_id",
    teller_status_id: "teller_status_id",
    has_org_filled_id: "has_org_filled_id",
    metro_area_id: "metro_area_id",
  };
  const cols: string[] = ["name"];
  const placeholders: string[] = [`'Untitled'`];
  const params: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(prefill)) {
    if (!allowed[k]) continue;
    params.push(v ? Number(v) : null);
    cols.push(allowed[k]);
    placeholders.push(`$${params.length}`);
  }
  await poolV002.query(
    `INSERT INTO people (${cols.join(",")}) VALUES (${placeholders.join(",")})`,
    params,
  );
  revalidatePeoplePage();
}

export async function deletePerson(id: string) {
  await poolV002.query(`DELETE FROM people WHERE id = $1`, [id]);
  revalidatePeoplePage();
}
