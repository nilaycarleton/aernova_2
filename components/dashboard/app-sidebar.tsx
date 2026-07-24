import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard?view=projects", label: "Projects" },
  { href: "/dashboard?view=measurements", label: "Measurements" },
  { href: "/dashboard?view=inspections", label: "Inspections" },
  { href: "/dashboard?view=reports", label: "Reports" },
  { href: "/dashboard?view=crm", label: "CRM" },
  { href: "/dashboard?view=operations", label: "Operations" },
  { href: "/dashboard?view=portal", label: "Customer Portal" },
];

export function AppSidebar() {
  return (
    <aside className="min-w-0 border-r border-hairline bg-surface-sidebar p-4">
      <div className="mb-8 rounded-xl border border-hairline bg-surface-raised p-4">
        <div className="text-xl font-semibold tracking-wide text-ink-primary">
          Aernova
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Roofing intelligence platform
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="block rounded-lg px-4 py-3 text-ink-secondary transition hover:bg-surface-raised hover:text-ink-primary"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
