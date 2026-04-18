import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata = { title: "JTBD" };

const SECTIONS: Array<{
  href: string;
  title: string;
  description: string;
}> = [
  {
    href: "/jtbd/thinkers",
    title: "Thinkers",
    description:
      "Writers and thinkers who espouse the importance of particular jobs",
  },
  {
    href: "/jtbd/jobs",
    title: "Jobs",
    description:
      "The jobs If Not For does for its users — feel connected, feel nostalgic, feel like a good person…",
  },
  {
    href: "/jtbd/components",
    title: "Components",
    description: "Parts of the If Not For app that do jobs for users",
  },
];

export default function JtbdIndexPage() {
  return (
    <PageShell title="JTBD">
      <p className="text-sm text-muted-foreground mb-6">
        Jobs to be done — mapping components to jobs, and jobs to the thinkers
        who espouse their importance.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 max-w-3xl">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block border rounded-md p-4 hover:border-foreground/60 transition-colors"
            >
              <h2 className="font-semibold mb-1">{s.title}</h2>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
