"use client";

import { useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TabKey = "inspect" | "scan" | "quote";

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: "inspect", label: "Inspect", hint: "Photos & issues" },
  { key: "scan", label: "Scan & measure", hint: "3D model & measurements" },
  { key: "quote", label: "Quote", hint: "Proposal & pricing" },
];

function isTabKey(value: string | null): value is TabKey {
  return value === "inspect" || value === "scan" || value === "quote";
}

/**
 * Organizes the project's many panels into three plain tabs so the page shows
 * one focused area at a time instead of an endless wall of cards. All tabs stay
 * mounted (inactive ones hidden) so the 3D model stays loaded when you switch
 * tabs and come back.
 *
 * The active tab lives in the URL (?tab=), so refresh, the browser back button,
 * and a shared link all land on the right tab. `initialTab` (computed server-
 * side, e.g. "quote" right after a proposal is generated) is the fallback when
 * the URL carries no tab yet.
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    inspect: null,
    scan: null,
    quote: null,
  });

  const urlTab = searchParams.get("tab");
  const tab: TabKey = isTabKey(urlTab) ? urlTab : initialTab;

  function selectTab(key: TabKey) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", key);
    // replace, not push: switching tabs shouldn't stack history entries, but the
    // URL still updates so refresh / share / back-from-elsewhere all work.
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // WAI-ARIA tabs keyboard model: arrows move (and activate) with wrap, Home/End
  // jump to the ends. Focus follows so a keyboard user lands on the new tab.
  function onKeyDown(event: React.KeyboardEvent) {
    const index = TABS.findIndex((t) => t.key === tab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextKey = TABS[nextIndex].key;
    selectTab(nextKey);
    tabRefs.current[nextKey]?.focus();
  }

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Project sections"
        onKeyDown={onKeyDown}
        className="sticky top-2 z-20 flex gap-1 rounded-2xl border border-hairline bg-ground/80 p-1 backdrop-blur"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[t.key] = el;
              }}
              id={`tab-${t.key}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${t.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => selectTab(t.key)}
              className={`flex-1 rounded-xl px-3 py-3 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument sm:px-4 sm:text-left ${
                active ? "bg-instrument text-ground" : "text-ink-secondary hover:bg-surface-raised"
              }`}
            >
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className={`mt-0.5 text-xs ${active ? "text-ground" : "text-ink-muted"}`}>{t.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {TABS.map((t) => (
          <div
            key={t.key}
            id={`panel-${t.key}`}
            role="tabpanel"
            aria-labelledby={`tab-${t.key}`}
            tabIndex={0}
            hidden={tab !== t.key}
            className="space-y-8 focus-visible:outline-none"
          >
            {t.key === "inspect" ? inspect : t.key === "scan" ? scan : quote}
          </div>
        ))}
      </div>
    </div>
  );
}
