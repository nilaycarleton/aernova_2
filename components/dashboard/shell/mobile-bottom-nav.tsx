"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import type { NavItemDef } from "@/lib/shell-nav";

/**
 * The Phase 0 finding this exists to fix: at 390px, the old shell rendered
 * the entire sidebar before any page content (docs/phase-0/00-baseline-
 * report.md). This bar is fixed, 44px-minimum touch targets, and never
 * stacks above content — content is always the first thing painted.
 *
 * `lg:hidden` matches AppShell's own `mobileNav.breakpoint="lg"` (1024px,
 * see shell-chrome.tsx) exactly, so the bottom bar and the drawer switch at
 * the same width the sidebar does.
 */
export function MobileBottomNav({
  items,
  activeId,
  onMore,
}: {
  items: NavItemDef[];
  activeId: string | undefined;
  onMore: () => void;
}) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-hairline bg-surface-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
              isActive ? "text-ink-primary" : "text-ink-muted"
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
            <span className="truncate px-1">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs text-ink-muted transition-colors hover:text-ink-primary"
      >
        <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
