import { AppSidebar } from "@/components/dashboard/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full max-w-full grid-cols-1 overflow-x-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
      <AppSidebar />
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex h-16 min-w-0 items-center justify-between gap-4 border-b border-white/10 px-4 md:px-6">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">Welcome back</p>
            <h1 className="truncate text-lg font-semibold text-white">Aernova Demo</h1>
          </div>

          <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            Demo Mode
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
