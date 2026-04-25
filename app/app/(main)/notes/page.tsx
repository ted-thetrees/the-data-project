export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Notes" };

import { unstable_cache } from "next/cache";
import { getNotesRecords, getNotesCount } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Subtitle } from "@/components/subtitle";
import { InboxRealtime } from "../inbox/inbox-realtime";
import { InfiniteInbox } from "../inbox/infinite-inbox";
import { loadMoreNotesCards } from "../inbox/actions";
import { resolveInboxCards } from "../inbox/card-data";

const getCachedNotesRecords = unstable_cache(getNotesRecords, ["notes-records-v1"], {
  tags: ["inbox"],
  revalidate: 30,
});
const getCachedNotesCount = unstable_cache(getNotesCount, ["notes-count-v1"], {
  tags: ["inbox"],
  revalidate: 30,
});

export default async function NotesPage() {
  const [records, count] = await Promise.all([
    getCachedNotesRecords(50),
    getCachedNotesCount(),
  ]);
  const initial = await resolveInboxCards(records);

  return (
    <PageShell title="Notes" count={count} maxWidth="">
      <InboxRealtime />
      <Subtitle>Free-form notes captured throughout the day — newest first.</Subtitle>
      <InfiniteInbox
        initial={initial}
        loader={loadMoreNotesCards}
        emptyLabel="End of notes"
      />
    </PageShell>
  );
}
