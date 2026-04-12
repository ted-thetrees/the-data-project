import "./grid-theme.css";

export default function GridLayout({ children }: { children: React.ReactNode }) {
  return <div data-grid-theme>{children}</div>;
}
