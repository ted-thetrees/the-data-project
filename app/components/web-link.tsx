import { Empty } from "@/components/empty";

export function WebLink({ url }: { url: string | null | undefined }) {
  if (!url) return <Empty />;
  const display = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="themed-link truncate block"
    >
      {display}
    </a>
  );
}
