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
