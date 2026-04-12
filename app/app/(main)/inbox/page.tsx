export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

import { getInboxRecords, getInboxCount } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { InboxList } from "./inbox-list";
import { InboxRealtime } from "./inbox-realtime";

export default async function Home() {
  const [records, count] = await Promise.all([
    getInboxRecords(50),
    getInboxCount(),
  ]);

  return (
    <PageShell title="Inbox" count={count} maxWidth="max-w-2xl">
      <InboxRealtime />
      <InboxList records={records} />
    </PageShell>
  );
}
