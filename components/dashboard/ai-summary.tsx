"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

/**
 * A plain-language recap of where a job stands, generated on demand. It
 * lives at the top of the assistant drawer — a helper, not a stage of the job —
 * so it never sits between the contractor and the roof (PRODUCT.md: "calm is a
 * function of sequence"). The copy stays in the trade's language: "Job
 * overview", not "AI summary".
 *
 * Collapsed by default so the drawer opens on the chat; Generate expands it.
 */
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; summary: string }
  | { status: "error"; message: string };

export function AiSummary({ jobId }: { jobId: string }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [open, setOpen] = useState(false);

  async function generate() {
    setOpen(true);
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/jobs/${jobId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "summarize_project" }),
      });
      if (!res.ok) {
        // Surface the server's reason verbatim when it gives one (e.g. a rate
        // limit), otherwise a plain fallback — never a silent failure.
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `Couldn't build the overview (${res.status}).`);
      }
      const data = (await res.json()) as { summary?: string };
      if (!data.summary) throw new Error("The overview came back empty. Try again.");
      setState({ status: "ready", summary: data.summary });
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "Couldn't build the overview. Try again.",
      });
    }
  }

  const busy = state.status === "loading";
  const hasResult = state.status === "ready";

  return (
    <section className="shrink-0 border-b border-hairline">
      <div className="flex items-center gap-3 px-5 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="job-overview-body"
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument"
        >
          <ChevronRight
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className={`shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none ${
              open ? "rotate-90" : ""
            }`}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink-primary">Job overview</span>
            <span className="block text-xs text-ink-primary/50">
              A plain-language recap of where this job stands
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="shrink-0 rounded-lg border border-hairline bg-surface-lifted px-3 py-1.5 text-xs font-medium text-ink-primary transition hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument disabled:opacity-40"
        >
          {busy ? "Working…" : hasResult ? "Refresh" : "Generate"}
        </button>
      </div>

      <div id="job-overview-body" hidden={!open} className="max-h-48 overflow-y-auto px-5 pb-4">
        {state.status === "idle" && (
          <p className="text-sm text-ink-primary/60">
            No overview yet. Generate a quick recap you can read straight to a homeowner.
          </p>
        )}

        {state.status === "loading" && (
          <div className="space-y-2" aria-live="polite">
            <span className="sr-only">Building the overview…</span>
            <div className="h-3 w-full animate-pulse rounded bg-surface-lifted motion-reduce:animate-none" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-surface-lifted motion-reduce:animate-none" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-surface-lifted motion-reduce:animate-none" />
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className="space-y-2">
            <p className="text-sm text-ink-secondary">{state.message}</p>
            <button
              type="button"
              onClick={generate}
              className="rounded-lg border border-hairline bg-surface-lifted px-3 py-1.5 text-xs font-medium text-ink-primary transition hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument"
            >
              Try again
            </button>
          </div>
        )}

        {state.status === "ready" && (
          <p className="whitespace-pre-wrap text-sm leading-6 text-ink-primary/90" aria-live="polite">
            {state.summary}
          </p>
        )}
      </div>
    </section>
  );
}
