export function ExternalLink({
  url,
  children,
  className,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={`/api/open?url=${encodeURIComponent(url)}`}
      className={className}
    >
      {children}
    </a>
  );
}
