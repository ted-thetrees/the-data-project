import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import type { PillOption } from "@/components/pill";
import {
  TableFeaturesGrid,
  type CatalogRow,
  type FeatureRow,
  type CoverageRow,
} from "./table-features-grid";

export const metadata = { title: "Table Features" };
export const dynamic = "force-dynamic";

async function getCatalog(): Promise<CatalogRow[]> {
  const r = await poolV002.query<CatalogRow>(
    `SELECT id::text AS id, name, path, notes, sort_order
     FROM tables_catalog
     ORDER BY sort_order NULLS LAST, name`,
  );
  return r.rows;
}

async function getFeatures(): Promise<FeatureRow[]> {
  const r = await poolV002.query<FeatureRow>(
    `SELECT id::text AS id, key, label, category, description, default_for_new, sort_order
     FROM tables_features
     ORDER BY sort_order NULLS LAST, label`,
  );
  return r.rows;
}

async function getCoverage(): Promise<CoverageRow[]> {
  const r = await poolV002.query<CoverageRow>(
    `SELECT table_id::text AS table_id, feature_id::text AS feature_id, status_id::text AS status_id
     FROM tables_coverage`,
  );
  return r.rows;
}

async function getStatusOptions(): Promise<PillOption[]> {
  const r = await poolV002.query<PillOption>(
    `SELECT id::text AS id, name, color FROM tables_feature_statuses
     ORDER BY sort_order NULLS LAST, name`,
  );
  return r.rows;
}

export default async function TableFeaturesPage() {
  const [catalog, features, coverage, statusOptions] = await Promise.all([
    getCatalog(),
    getFeatures(),
    getCoverage(),
    getStatusOptions(),
  ]);
  return (
    <PageShell title="Table Features" count={catalog.length} maxWidth="">
      <Realtime
        tables={[
          "tables_catalog",
          "tables_features",
          "tables_feature_statuses",
          "tables_coverage",
        ]}
      />
      <Subtitle>
        Cross-tab of every grid page × every feature. Features marked{" "}
        <em>Default for new</em> should be enabled on new tables by default.
      </Subtitle>
      <TableFeaturesGrid
        catalog={catalog}
        features={features}
        coverage={coverage}
        statusOptions={statusOptions}
      />
    </PageShell>
  );
}
