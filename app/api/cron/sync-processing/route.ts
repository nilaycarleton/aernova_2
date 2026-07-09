import { NextResponse } from "next/server";
import { syncAllInFlightModelJobs } from "@/lib/processing-jobs";

// Never cache: each hit must pull live NodeODM status.
export const dynamic = "force-dynamic";

/**
 * Unattended sweep that advances every in-flight NodeODM MODEL job. Point a
 * scheduler at this (Vercel Cron, GitHub Actions, or any external pinger) so
 * queued reconstructions reach READY without a human refreshing a project.
 *
 * Auth: when CRON_SECRET is set, callers must send `Authorization: Bearer
 * <CRON_SECRET>` (the header Vercel Cron sends). If it is unset the route is
 * open — fine for local/dev, but set CRON_SECRET before exposing this publicly.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncAllInFlightModelJobs();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sweep failed" },
      { status: 500 }
    );
  }
}
