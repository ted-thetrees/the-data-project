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
  await poolV002.query(`INSERT INTO people (name) VALUES ('Untitled')`);
  revalidatePeoplePage();
}

export async function createPersonMetroArea(
  personId: string,
  name: string,
  fullName: string,
  color: string,
) {
  const cleanName = name.trim();
  const cleanFullName = fullName.trim();
  const cleanColor = (color || "#727272").trim();
  if (!cleanName || !cleanFullName) {
    throw new Error("Name and full name are required");
  }
  const result = await poolV002.query<{ id: string }>(
    `INSERT INTO people_metro_areas (name, full_name, color, sort_order)
     VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort_order) + 1 FROM people_metro_areas), 1))
     RETURNING id::text AS id`,
    [cleanName, cleanFullName, cleanColor],
  );
  const newId = result.rows[0]?.id;
  if (newId) {
    await poolV002.query(
      `UPDATE people SET metro_area_id = $1, updated_at = now() WHERE id = $2`,
      [Number(newId), personId],
    );
  }
  revalidatePeoplePage();
  revalidatePath("/pick-lists/people");
}
