import { Empty } from "@/components/empty";

export function WebLink({
  url,
  className = "",
}: {
  url: string | null | undefined;
  className?: string;
}) {
  if (!url) return <Empty />;
  const display = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className={`themed-link truncate block ${className}`}
    >
      {display}
    </a>
  );
}
