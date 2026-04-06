import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Baserow table IDs → Postgres table names
const BR = {
  Inbox: "database_table_179",
  Passphrases: "database_table_180",
  People: "database_table_181",
  Project_Matrix: "database_table_182",
  Picklist_Colors: "database_table_183",
  Colors: "database_table_184",
} as const;

// Baserow field_* column mappings
const F = {
  // Inbox (179)
  inbox_title: "field_1737",
  inbox_record_type: "field_1738",
  inbox_created_date: "field_1739",
  inbox_teable_id: "field_1740",
  // Passphrases (180)
  pass_passphrase: "field_1744",
  pass_table_name: "field_1745",
  pass_record_id: "field_1746",
  pass_created_date: "field_1747",
  pass_teable_id: "field_1748",
  // People (181)
  people_name: "field_1749",
  people_familiarity: "field_1752",
  people_gender: "field_1753",
  people_known_as: "field_1754",
  people_metro_area: "field_1755",
  people_created_date: "field_1756",
  people_has_org_filled: "field_1757",
  people_teller_status: "field_1758",
  people_teable_id: "field_1759",
  // Project_Matrix (182)
  pm_uber_project: "field_1763",
  pm_project: "field_1764",
  pm_project_status: "field_1765",
  pm_project_order: "field_1766",
  pm_project_notes: "field_1767",
  pm_task: "field_1768",
  pm_task_status: "field_1769",
  pm_task_order: "field_1770",
  pm_task_result: "field_1771",
  pm_task_notes: "field_1772",
  pm_hyphen: "field_1773",
  pm_teable_id: "field_1774",
  pm_tickle_date: "field_1775",
  pm_tickle_date_cfg: "field_1776",
  pm_created_date: "field_1777",
  // Picklist_Colors (183)
  pc_field: "field_1781",
  pc_option: "field_1782",
  pc_color: "field_1783",
  pc_table: "field_1784",
  pc_teable_id: "field_1785",
  // Colors (184)
  colors_name: "field_1786",
  colors_hex: "field_1789",
  colors_palette: "field_1790",
  colors_teable_id: "field_1791",
} as const;

export async function getInboxRecords(limit = 100, offset = 0) {
  const result = await pool.query(
    `SELECT
      i.id::text as id,
      i.${F.inbox_title} as content,
      i.${F.inbox_record_type} as record_type,
      i.${F.inbox_created_date} as created_date,
      p.${F.pass_passphrase} as passphrase
    FROM ${BR.Inbox} i
    LEFT JOIN ${BR.Passphrases} p ON p.${F.pass_record_id} = i.${F.inbox_teable_id}
    WHERE i.trashed = false
    ORDER BY i.${F.inbox_created_date} DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function getProjectMatrix() {
  const result = await pool.query(
    `SELECT
      id::text as id,
      ${F.pm_uber_project} as uber_project,
      ${F.pm_task_status} as task_status,
      ${F.pm_task} as task,
      ${F.pm_task_result} as task_result,
      ${F.pm_task_notes} as task_notes,
      ${F.pm_tickle_date} as tickle_date,
      ${F.pm_project_status} as project_status,
      ${F.pm_project_notes} as project_notes,
      ${F.pm_project} as project,
      ${F.pm_created_date} as created_date
    FROM ${BR.Project_Matrix}
    WHERE trashed = false
    ORDER BY ${F.pm_uber_project}, ${F.pm_tickle_date} ASC NULLS LAST, ${F.pm_project}`
  );
  return result.rows;
}

export interface BaserowFieldSchema {
  id: string;
  dbFieldName: string;
  name: string;
  type: string;
  options?: string[];
  isPrimary?: boolean;
}

// Kept for backward compat with components that use this type
export type TeableFieldSchema = BaserowFieldSchema;

export async function getBaserowSchema(tableId: number): Promise<BaserowFieldSchema[]> {
  const baserowUrl = process.env.BASEROW_URL || "https://baserow.ifnotfor.com";
  const baserowToken = process.env.BASEROW_TOKEN!;

  const res = await fetch(`${baserowUrl}/api/database/fields/table/${tableId}/`, {
    headers: { Authorization: `Token ${baserowToken}` },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const fields = await res.json();
  return fields.map((f: Record<string, unknown>) => ({
    id: String(f.id),
    dbFieldName: `field_${f.id}`,
    name: f.name,
    type: f.type as string,
    isPrimary: f.primary || false,
    options: f.type === "single_select" && Array.isArray((f as Record<string, unknown>).select_options)
      ? ((f as Record<string, unknown>).select_options as { value: string }[]).map((c) => c.value)
      : undefined,
  }));
}

// Alias for backward compat
export const getTeableSchema = getBaserowSchema;

const BASEROW_TABLE_MAP: Record<string, { pgTable: string; baserowId: number }> = {
  People: { pgTable: BR.People, baserowId: 181 },
  Inbox: { pgTable: BR.Inbox, baserowId: 179 },
  Project_Matrix: { pgTable: BR.Project_Matrix, baserowId: 182 },
  Picklist_Colors: { pgTable: BR.Picklist_Colors, baserowId: 183 },
  Colors: { pgTable: BR.Colors, baserowId: 184 },
  Passphrases: { pgTable: BR.Passphrases, baserowId: 180 },
};

export async function getTableData(tableIdOrName: string, tableName: string) {
  const tableInfo = BASEROW_TABLE_MAP[tableName];
  if (!tableInfo) return { rows: [], schema: [] };

  const schema = await getBaserowSchema(tableInfo.baserowId);
  if (schema.length === 0) return { rows: [], schema };

  const columns = schema.map((f) => `${f.dbFieldName} as "${f.dbFieldName}"`);
  const primaryField = schema.find((f) => f.isPrimary);
  const orderBy = primaryField ? `ORDER BY ${primaryField.dbFieldName}` : "";

  const result = await pool.query(
    `SELECT id::text as id, ${columns.join(", ")}
     FROM ${tableInfo.pgTable}
     WHERE trashed = false
     ${orderBy}`
  );

  return { rows: result.rows, schema };
}

export async function getPeople() {
  return getTableData("181", "People");
}

export async function getPicklistColors(tableName?: string) {
  const result = await pool.query(
    `SELECT
      id::text as id,
      ${F.pc_table} as table_name,
      ${F.pc_field} as field,
      ${F.pc_option} as option,
      ${F.pc_color} as color
    FROM ${BR.Picklist_Colors}
    WHERE trashed = false
    ${tableName ? `AND ${F.pc_table} = $1` : ''}
    ORDER BY ${F.pc_table}, ${F.pc_field}, ${F.pc_option}`,
    tableName ? [tableName] : []
  );
  return result.rows;
}

export async function getInboxCount() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM ${BR.Inbox} WHERE trashed = false`
  );
  return parseInt(result.rows[0].count);
}

// Field mappings exposed for use by other modules
export { BR, F };
