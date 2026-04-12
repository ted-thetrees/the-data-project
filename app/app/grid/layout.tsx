import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

export default function GridLayout({ children }: { children: React.ReactNode }) {
  return (
    <Theme accentColor="gray" grayColor="slate" radius="small" scaling="95%">
      {children}
    </Theme>
  );
}
