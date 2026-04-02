"use client";

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
    <button
      onClick={() => {
        fetch(`/api/open?url=${encodeURIComponent(url)}`);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
