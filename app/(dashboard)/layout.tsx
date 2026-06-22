import { UserButton } from "@clerk/nextjs";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { requireCompanyContext } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company, user } = await requireCompanyContext();
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <div className="grid min-h-screen w-full max-w-full grid-cols-1 overflow-x-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
      <AppSidebar />
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex h-16 min-w-0 items-center justify-between gap-4 border-b border-white/10 px-4 md:px-6">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">Welcome back, {displayName}</p>
            <h1 className="truncate text-lg font-semibold text-white">{company.name}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <UserButton />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
