/**
 * Multi-value tag grouping contract.
 *
 * When a table is grouped by a multi-value tag column, a record with N tags
 * appears once per tag, under each group header. The core invariant:
 *
 *     display multiplicity, counting singularity
 *
 * A record can render N times, but it still counts as ONE in every aggregate:
 * totals, selection, "select all", formulas, bulk edits. Every expanded row
 * carries two IDs:
 *
 *   - `display_id`  — unique per rendered row. Feeds React keys, virtualization,
 *                     and the icicle rowSpan math in computeGroupSpans().
 *                     Shape: `${record_id}:${group_id ?? 'null'}`.
 *
 *   - `record_id`   — identifies the underlying canonical record. Drives
 *                     editing, mutations, selection, and counts. Multiple
 *                     rendered rows can share the same record_id.
 *
 * Rule for any code consuming an expanded row set: mutations key off
 * `record_id`, never `display_id`. Any future selection or bulk-edit UI that
 * ever sees rows from an `expandOnGroup` column MUST dedupe on `record_id`
 * before acting. A broken "select all" is the most likely footgun.
 *
 * Rows with zero tags still appear — once — in a synthetic "Uncategorized"
 * bucket (group_id = null). This is the LEFT JOIN contract: never silently
 * drop tagless records from a grouped view.
 */

export interface ExpandableRow {
  record_id: string;
  display_id: string;
}

export interface ExpandOnGroupConfig {
  /** Column key in the row for the group label (e.g., "area_name"). */
  groupKey: string;
  /** Column key in the row for the group id (e.g., "area_id"). */
  groupIdKey: string;
  /** Header text for the group column itself. */
  groupLabel: string;
  /** Label used when group_id is null (records with no tags). */
  nullGroupLabel: string;
}

/**
 * Build a stable display_id for an expanded row. Pass `null` for records
 * that land in the Uncategorized bucket. The literal string "null" is a
 * valid sentinel — it collides with nothing because real ids never equal it.
 */
export function makeDisplayId(
  recordId: string,
  groupId: string | null,
): string {
  return `${recordId}:${groupId ?? "null"}`;
}

/**
 * Generic N-level nested grouping for table rows.
 *
 * Callers pass a list of GroupBySpec objects — one per level, outer-to-inner.
 * Each spec provides a function to extract the group key and its display label
 * for a given row. A null key lands rows in a synthetic "Uncategorized"
 * bucket (mirrors the LEFT JOIN contract).
 *
 * Returns a tree of {group, children} and {row} nodes. Consumers walk the
 * tree and render group headers + data rows; collapse state is tracked
 * separately by the caller (usually ephemeral Set<string> of group paths).
 */

export const UNCATEGORIZED_KEY = "__null__";

export interface GroupBySpec<T> {
  field: string;
  getKey: (row: T) => string | null;
  getLabel: (key: string | null, rows: T[]) => string;
}

export interface GroupNode<T> {
  kind: "group";
  level: number;
  field: string;
  /** Unique key within this group's siblings (the extracted key, or UNCATEGORIZED_KEY). */
  groupKey: string;
  /** The extracted value for this group; null for the Uncategorized bucket. */
  value: string | null;
  label: string;
  /** Total leaf-row count under this group (including nested groups). */
  count: number;
  /** Cumulative path from the root, e.g. "category:abc|status:xyz". Use as collapse key. */
  path: string;
  children: GroupItem<T>[];
}

export interface RowNode<T> {
  kind: "row";
  row: T;
}

export type GroupItem<T> = GroupNode<T> | RowNode<T>;

export function groupRows<T>(
  rows: T[],
  specs: GroupBySpec<T>[],
  level = 0,
  parentPath = "",
): GroupItem<T>[] {
  if (specs.length === 0) {
    return rows.map((row) => ({ kind: "row", row }) satisfies RowNode<T>);
  }
  const [spec, ...rest] = specs;
  const buckets = new Map<
    string,
    { value: string | null; rows: T[] }
  >();
  for (const row of rows) {
    const key = spec.getKey(row);
    const bucketKey = key ?? UNCATEGORIZED_KEY;
    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = { value: key, rows: [] };
      buckets.set(bucketKey, bucket);
    }
    bucket.rows.push(row);
  }
  const out: GroupNode<T>[] = [];
  for (const [bucketKey, bucket] of buckets) {
    const path = parentPath
      ? `${parentPath}|${spec.field}:${bucketKey}`
      : `${spec.field}:${bucketKey}`;
    const children = groupRows(bucket.rows, rest, level + 1, path);
    out.push({
      kind: "group",
      level,
      field: spec.field,
      groupKey: bucketKey,
      value: bucket.value,
      label: spec.getLabel(bucket.value, bucket.rows),
      count: bucket.rows.length,
      path,
      children,
    });
  }
  return out;
}
