export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "YouTube" };

import { getYouTubeRecords, getYouTubeCount } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Subtitle } from "@/components/subtitle";
import { InboxRealtime } from "../inbox/inbox-realtime";
import { InfiniteInbox } from "../inbox/infinite-inbox";
import { loadMoreYouTubeCards } from "../inbox/actions";
import { resolveInboxCards } from "../inbox/card-data";

export default async function YouTubePage() {
  const [records, count] = await Promise.all([
    getYouTubeRecords(50),
    getYouTubeCount(),
  ]);
  const initial = await resolveInboxCards(records);

  return (
    <PageShell title="YouTube" count={count} maxWidth="">
      <InboxRealtime />
      <Subtitle>YouTube videos saved for later watching.</Subtitle>
      <InfiniteInbox
        initial={initial}
        loader={loadMoreYouTubeCards}
        emptyLabel="End of videos"
      />
    </PageShell>
  );
}
