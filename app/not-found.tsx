import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Not found</h1>
        <p className="mt-3 text-sm text-slate-400">
          This page doesn’t exist, or it belongs to another company workspace.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl border border-white/10 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/30"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
