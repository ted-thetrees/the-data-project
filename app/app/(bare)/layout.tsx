import type { Metadata } from "next";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./bare.css";
import { PrimeProvider } from "./prime-provider";

export const metadata: Metadata = {
  title: "Grid",
};

export default function BareLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PrimeProvider>{children}</PrimeProvider>
      </body>
    </html>
  );
}
