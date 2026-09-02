"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "@astryxdesign/core/CommandPalette";
import { createStaticSource, type SearchableItem } from "@astryxdesign/core/Typeahead";
import type { CompanyRole } from "@prisma/client";
import { Plus } from "lucide-react";
import { can } from "@/lib/permissions";
import { visibleNavItems } from "@/lib/shell-nav";

/**
 * Command launcher (Premium UI Redesign Phase 2, Step 15/42). Deliberately
 * scoped to what actually exists: navigation destinations this role can
 * reach, plus the same creation actions `+ Create` exposes. Aernova has no
 * entity search (no job/client/quote full-text index anywhere in the
 * codebase), so this does not offer to search jobs, clients, or invoices —
 * doing so would be a UI lying about a backend that doesn't exist. The input
 * placeholder says "Search commands," not "Search," for the same reason.
 */
type CommandGroup = "Navigation" | "Create";

type CommandItem = SearchableItem<{ group: CommandGroup }>;

export function CommandPaletteShell({
  isOpen,
  onOpenChange,
  role,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  role: CompanyRole;
}) {
  const router = useRouter();

  const items = useMemo<CommandItem[]>(() => {
    const navCommands: CommandItem[] = visibleNavItems(role).map((item) => ({
      id: `nav:${item.id}`,
      label: item.label,
      auxiliaryData: { group: "Navigation" as const },
    }));

    const createCommands: CommandItem[] = [];
    if (can(role, "editJob")) {
      createCommands.push(
        { id: "create:job", label: "New job", auxiliaryData: { group: "Create" } },
        { id: "create:request", label: "New request", auxiliaryData: { group: "Create" } },
        { id: "create:quote", label: "New quote", auxiliaryData: { group: "Create" } },
        { id: "create:invoice", label: "New invoice", auxiliaryData: { group: "Create" } },
        { id: "create:client", label: "New client", auxiliaryData: { group: "Create" } }
      );
    }

    return [...navCommands, ...createCommands];
  }, [role]);

  const source = useMemo(() => createStaticSource(items), [items]);

  function handleSelect(id: string) {
    onOpenChange(false);
    const destinations: Record<string, string> = {
      "nav:today": "/today",
      "nav:dashboard": "/dashboard",
      "nav:jobs": "/jobs",
      "nav:schedule": "/schedule",
      "nav:requests": "/requests",
      "nav:pipeline": "/pipeline",
      "nav:clients": "/clients",
      "nav:quotes": "/quotes",
      "nav:invoices": "/invoices",
      "nav:reports": "/reports",
      "nav:team": "/team",
      "nav:settings": "/settings",
      "create:job": "/jobs/new",
      "create:request": "/requests/new",
      "create:quote": "/jobs",
      "create:invoice": "/quotes?status=APPROVED",
    };
    if (id === "create:client") {
      // No standalone route — the same "New client" flow QuickCreateMenu
      // uses is a dialog, not a page. Route to Clients, where that same
      // creation entry point already lives, rather than duplicating a
      // second client-creation form here.
      router.push("/clients");
      return;
    }
    const href = destinations[id];
    if (href) router.push(href);
  }

  return (
    <CommandPalette
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={source}
      label="Command palette"
      emptyBootstrapText="Type to search commands"
      emptySearchText="No matching commands"
      renderItem={(item) => (
        <span className="flex items-center gap-2">
          {item.auxiliaryData?.group === "Create" ? (
            <Plus size={14} strokeWidth={2} aria-hidden="true" className="text-ink-muted" />
          ) : null}
          {item.label}
        </span>
      )}
      onValueChange={handleSelect}
    />
  );
}
