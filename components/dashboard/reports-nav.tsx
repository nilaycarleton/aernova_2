import { FilterPill } from "@/components/dashboard/filter-pill";

const SECTIONS = [
  { href: "/reports", label: "Win rate" },
  { href: "/reports/revenue", label: "Revenue" },
  { href: "/reports/aged-receivables", label: "Aged receivables" },
];

/**
 * The three reports, as links rather than a `<select>` — same reasoning as
 * `FilterPill` itself: each is a place with its own URL, not a mode toggled
 * on one page.
 */
export function ReportsNav({ current }: { current: string }) {
  return (
    <nav aria-label="Reports" className="flex flex-wrap gap-2">
      {SECTIONS.map((section) => (
        <FilterPill key={section.href} href={section.href} active={current === section.href}>
          {section.label}
        </FilterPill>
      ))}
    </nav>
  );
}
