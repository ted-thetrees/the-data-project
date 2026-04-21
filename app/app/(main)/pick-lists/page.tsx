import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata = { title: "Pick Lists" };

const SECTIONS: Array<{
  href: string;
  title: string;
  description: string;
}> = [
  {
    href: "/pick-lists/people",
    title: "People",
    description:
      "Familiarity, gender, teller status, has org filled, metro areas",
  },
  {
    href: "/pick-lists/talent",
    title: "Talent",
    description: "Categories, rating levels, areas of expertise",
  },
  {
    href: "/pick-lists/projects",
    title: "Projects",
    description: "Project statuses, task statuses, uber projects",
  },
  {
    href: "/pick-lists/user-stories",
    title: "User Stories",
    description: "Roles, categories",
  },
  {
    href: "/pick-lists/crime-series",
    title: "Crime Series",
    description: "Statuses",
  },
  {
    href: "/pick-lists/get",
    title: "Get",
    description: "Categories, statuses, sources",
  },
];

export default function PickListsIndexPage() {
  return (
    <PageShell title="Pick Lists">
      <p className="text-sm text-muted-foreground mb-6">
        Pick a section to manage its lookup tables.
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
