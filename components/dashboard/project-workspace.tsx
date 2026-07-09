"use client";

import { useState, type ReactNode } from "react";

type TabKey = "inspect" | "scan" | "quote";

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: "inspect", label: "Inspect", hint: "Photos & issues" },
  { key: "scan", label: "Scan & measure", hint: "3D model & measurements" },
  { key: "quote", label: "Quote", hint: "Proposal & pricing" },
];

/**
 * Organizes the project's many panels into three plain tabs so the page shows
 * one focused area at a time instead of an endless wall of cards. All tabs stay
 * mounted (inactive ones hidden) so the 3D model stays loaded when you switch
 * tabs and come back.
 */
export function ProjectWorkspace({
  inspect,
  scan,
  quote,
  initialTab = "scan",
}: {
  inspect: ReactNode;
  scan: ReactNode;
  quote: ReactNode;
  initialTab?: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Project sections"
        className="sticky top-2 z-20 flex gap-1 rounded-2xl border border-white/10 bg-slate-950/80 p-1 backdrop-blur"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-center transition sm:px-4 sm:py-3 sm:text-left ${
                active ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className={`mt-0.5 hidden text-xs sm:block ${active ? "text-slate-800" : "text-slate-500"}`}>{t.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="space-y-8" hidden={tab !== "inspect"}>{inspect}</div>
        <div className="space-y-8" hidden={tab !== "scan"}>{scan}</div>
        <div className="space-y-8" hidden={tab !== "quote"}>{quote}</div>
      </div>
    </div>
  );
}
