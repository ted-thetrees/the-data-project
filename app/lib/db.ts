import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function getInboxRecords(limit = 100, offset = 0) {
  const result = await pool.query(
    `SELECT
      i.__id as id,
      i."Title" as content,
      i."Record_Type" as record_type,
      i."Created_Date" as created_date,
      p."Passphrase" as passphrase
    FROM "bsePwEnYg0x7fdbsdZR"."Inbox" i
    LEFT JOIN "bsePwEnYg0x7fdbsdZR"."Passphrases" p ON p."Record_ID" = i.__id
    ORDER BY i."Created_Date" DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function getProjectMatrix() {
  const result = await pool.query(
    `SELECT
      __id as id,
      "Uber_Project" as uber_project,
      "Task_Status" as task_status,
      "Task" as task,
      "Task_Result" as task_result,
      "Task_Notes" as task_notes,
      "Tickle_Date" as tickle_date,
      "Project_Status" as project_status,
      "Project_Notes" as project_notes,
      "Project" as project
    FROM "bsePwEnYg0x7fdbsdZR"."Project_Matrix"
    ORDER BY "Uber_Project", "Tickle_Date" ASC NULLS LAST, "Project"`
  );
  return result.rows;
}

export async function getPeople() {
  const result = await pool.query(
    `SELECT
      __id as id,
      "Name" as name,
      "Image" as image,
      "Familiarity" as familiarity,
      "Gender" as gender,
      "Known_As" as known_as,
      "Metro_Area" as metro_area,
      "Created_Date" as created_date,
      "Has_Org_Filled" as has_org_filled,
      "Target_Desirability" as target_desirability,
      "Teller_Status" as teller_status
    FROM "bsePwEnYg0x7fdbsdZR"."People"
    ORDER BY "Name"`
  );
  return result.rows;
}

export async function getColors() {
  const result = await pool.query(
    `SELECT
      __id as id,
      "Name" as name,
      "Hex" as hex,
      "Palette" as palette
    FROM "bsePwEnYg0x7fdbsdZR"."Colors"
    ORDER BY "Palette", "Name"`
  );
  return result.rows;
}

export async function getPicklistColors(tableName?: string) {
  const result = await pool.query(
    `SELECT
      __id as id,
      "Table" as table_name,
      "Field" as field,
      "Option" as option,
      "Color" as color
    FROM "bsePwEnYg0x7fdbsdZR"."Picklist_Colors"
    ${tableName ? 'WHERE "Table" = $1' : ''}
    ORDER BY "Table", "Field", "Option"`,
    tableName ? [tableName] : []
  );
  return result.rows;
}

export async function getInboxCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM "bsePwEnYg0x7fdbsdZR"."Inbox"`
  );
  return parseInt(result.rows[0].count);
}
