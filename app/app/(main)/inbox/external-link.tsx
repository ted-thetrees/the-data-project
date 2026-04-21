export function ExternalLink({
  url,
  children,
  className,
  title,
  style,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      style={style}
    >
      {children}
    </a>
  );
}
