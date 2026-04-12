import "./grid-theme.css";
import { GridThemeScope } from "./grid-theme-scope";

export default function GridLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GridThemeScope />
      {children}
    </>
  );
}
