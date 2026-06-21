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
    <aside className="min-w-0 border-r border-white/10 bg-slate-900/60 p-4">
      <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xl font-semibold tracking-wide text-white">
          Aernova
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Roofing intelligence platform
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="block rounded-lg px-4 py-3 text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
