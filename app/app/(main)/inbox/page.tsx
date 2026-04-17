export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Inbox" };

import { getInboxRecords, getInboxCount } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { InboxRealtime } from "./inbox-realtime";
import { BackfillPreviewsButton } from "./backfill-button";
import { countPendingPreviews } from "./actions";
import { InfiniteInbox } from "./infinite-inbox";
import { loadMoreInboxCards } from "./actions";
import { resolveInboxCards } from "./card-data";

export default async function Home() {
  const [records, count, pendingPreviews] = await Promise.all([
    getInboxRecords(50),
    getInboxCount(),
    countPendingPreviews(),
  ]);
  const initial = await resolveInboxCards(records);

  return (
    <PageShell title="Inbox" count={count} maxWidth="">
      <InboxRealtime />
      <div className="mb-4">
        <BackfillPreviewsButton initialPending={pendingPreviews} />
      </div>
      <InfiniteInbox initial={initial} loader={loadMoreInboxCards} />
    </PageShell>
  );
}
