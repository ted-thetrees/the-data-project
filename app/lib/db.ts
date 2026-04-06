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
      "Project" as project,
      __created_time as created_date
    FROM "bsePwEnYg0x7fdbsdZR"."Project_Matrix"
    ORDER BY "Uber_Project", "Tickle_Date" ASC NULLS LAST, "Project"`
  );
  return result.rows;
}

export async function getPeople() {
  return getTableData("tblyvrNXdqftQGNIniT", "People");
}

// --- Dynamic table data fetcher ---

export interface TeableFieldSchema {
  id: string;
  dbFieldName: string;
  name: string;
  type: string;
  options?: string[];
  isPrimary?: boolean;
}

const TEABLE_BASE_SCHEMA = "bsePwEnYg0x7fdbsdZR";

export async function getTeableSchema(tableId: string): Promise<TeableFieldSchema[]> {
  const teableUrl = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
  const teableKey = process.env.TEABLE_API_KEY!;

  const res = await fetch(`${teableUrl}/api/table/${tableId}/field`, {
    headers: { Authorization: `Bearer ${teableKey}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];

  const fields = await res.json();
  return fields.map((f: Record<string, unknown>) => ({
    id: f.id,
    dbFieldName: f.dbFieldName,
    name: f.name,
    type: f.type,
    isPrimary: f.isPrimary || false,
    options: f.type === "singleSelect" && (f.options as Record<string, unknown>)?.choices
      ? ((f.options as Record<string, unknown>).choices as { name: string }[]).map((c) => c.name)
      : undefined,
  }));
}

export async function getTableData(tableId: string, tableName: string) {
  const schema = await getTeableSchema(tableId);
  if (schema.length === 0) return { rows: [], schema };

  const columns = schema.map((f) => `"${f.dbFieldName}" as "${f.dbFieldName.toLowerCase()}"`);
  const primaryField = schema.find((f) => f.isPrimary);
  const orderBy = primaryField ? `ORDER BY "${primaryField.dbFieldName}"` : "";

  const result = await pool.query(
    `SELECT __id as id, ${columns.join(", ")}
     FROM "${TEABLE_BASE_SCHEMA}"."${tableName}"
     ${orderBy}`
  );

  return { rows: result.rows, schema };
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

export async function getTeableFieldOptions(tableId: string): Promise<Record<string, string[]>> {
  const teableUrl = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
  const teableKey = process.env.TEABLE_API_KEY!;

  const res = await fetch(`${teableUrl}/api/table/${tableId}/field`, {
    headers: { Authorization: `Bearer ${teableKey}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) return {};

  const fields = await res.json();
  const result: Record<string, string[]> = {};

  for (const field of fields) {
    if (field.type === "singleSelect" && field.options?.choices) {
      result[field.name] = field.options.choices.map((c: { name: string }) => c.name);
    }
  }

  return result;
}

const PAIRED_COLORS = [
  "#fbb4ae", "#fdcdac", "#fed9a6", "#fff2ae", "#ffffb3", "#f1e2cc",
  "#e5d8bd", "#e6f5c9", "#ccebc5", "#b3e2cd", "#b3cde3", "#cbd5e8",
  "#decbe4", "#fddaec", "#f2f2f2", "#d9d9d9",
];

/**
 * Compare Teable field options against Picklist_Colors table.
 * Auto-create missing mappings with schemePaired colors (cycling).
 */
export async function syncPicklistColors(
  tableName: string,
  tableId: string,
  fieldLabelMap: Record<string, string> // { "Familiarity": "Familiarity", "Has Org Filled": "Org Filled", ... }
) {
  const teableUrl = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
  const teableKey = process.env.TEABLE_API_KEY!;

  // Get current field options from Teable
  const fieldOptions = await getTeableFieldOptions(tableId);

  // Get current picklist color mappings
  const existingColors = await getPicklistColors(tableName);
  const existingSet = new Set(
    existingColors.map((r: { field: string; option: string }) => `${r.field}::${r.option}`)
  );

  // Find missing mappings
  const toCreate: { field: string; option: string; color: string }[] = [];

  for (const [teableFieldName, displayLabel] of Object.entries(fieldLabelMap)) {
    const options = fieldOptions[teableFieldName] || [];
    // Count existing colors for this field to continue the cycling pattern
    const existingCount = existingColors.filter(
      (r: { field: string }) => r.field === displayLabel
    ).length;

    options.forEach((option: string, i: number) => {
      if (!existingSet.has(`${displayLabel}::${option}`)) {
        const colorIndex = (existingCount + toCreate.filter((t) => t.field === displayLabel).length) % PAIRED_COLORS.length;
        toCreate.push({ field: displayLabel, option, color: PAIRED_COLORS[colorIndex] });
      }
    });
  }

  if (toCreate.length === 0) return;

  // Create missing records via Teable API
  const records = toCreate.map((t) => ({
    fields: { Table: tableName, Field: t.field, Option: t.option, Color: t.color },
  }));

  await fetch(`${teableUrl}/api/table/tbl0oH7BL6QQmUd5vak/record`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${teableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fieldKeyType: "name", records }),
  });
}

export async function getInboxCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM "bsePwEnYg0x7fdbsdZR"."Inbox"`
  );
  return parseInt(result.rows[0].count);
}
