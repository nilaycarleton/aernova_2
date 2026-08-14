"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CompanyRole } from "@prisma/client";
import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@astryxdesign/core/AppShell";
import { SideNav } from "@astryxdesign/core/SideNav";
import { SideNavSection } from "@astryxdesign/core/SideNav";
import { SideNavItem } from "@astryxdesign/core/SideNav";
import { SideNavHeading } from "@astryxdesign/core/SideNav";
import { SideNavCollapseButton } from "@astryxdesign/core/SideNav";
import { TopNav } from "@astryxdesign/core/TopNav";
import { MobileNav } from "@astryxdesign/core/MobileNav";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Search } from "lucide-react";
import {
  getSideNavCollapsedServerSnapshot,
  getSideNavCollapsedSnapshot,
  setSideNavCollapsed,
  subscribeSideNavCollapsed,
} from "@/lib/sidenav-store";
import { mobileOverflowGroups, mobilePrimaryItems, navItemsByGroup, activeNavItemId, routeTitle } from "@/lib/shell-nav";
import { can } from "@/lib/permissions";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { QuickCreateMenu } from "@/components/dashboard/quick-create-menu";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { CommandPaletteShell } from "./command-palette";

/**
 * The Precision Workshop application shell (Premium UI Redesign Phase 2).
 * Narrow client boundary mounted once by the server `app/(dashboard)/
 * layout.tsx` — receives only serializable facts (`role`, `companyName`,
 * `displayName`) already resolved server-side by `requireCompanyContext()`.
 * Everything nav-shaped (which destinations, which group, which is active,
 * the page title) is recomputed here from the shared pure `lib/shell-nav.ts`
 * module using that server-verified `role` — display logic only; every
 * route's own `requirePageCapability` call remains the actual gate.
 */
export function ShellChrome({
  role,
  companyName,
  displayName,
  children,
}: {
  role: CompanyRole;
  companyName: string;
  displayName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const isCollapsed = useSyncExternalStore(
    subscribeSideNavCollapsed,
    getSideNavCollapsedSnapshot,
    getSideNavCollapsedServerSnapshot
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isModK) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Route changes should never leave the mobile drawer open over the new
  // page. Adjusted during render (React's documented pattern for state that
  // must reset when a prop changes) rather than in an effect, which would
  // commit the open shell first and only correct it a tick later.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileNavOpen(false);
  }

  const groups = navItemsByGroup(role);
  const activeId = activeNavItemId(pathname, role);
  const title = routeTitle(pathname);
  const primaryMobileItems = mobilePrimaryItems(role);
  const overflowGroups = mobileOverflowGroups(role);
  const canCreate = can(role, "editJob");
  const canViewMoney = can(role, "viewMoney");

  const navContent = (
    <>
      {groups.map(({ group, items }) => (
        <SideNavSection key={group.id} title={group.label}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <SideNavItem
                key={item.id}
                label={item.label}
                href={item.href}
                isSelected={item.id === activeId}
                icon={<Icon size={17} strokeWidth={1.75} aria-hidden="true" />}
              />
            );
          })}
        </SideNavSection>
      ))}
    </>
  );

  return (
    <LinkProvider component={Link}>
      <AppShell
        variant="section"
        height="fill"
        contentPadding={0}
        topNav={
          <TopNav
            label="Page"
            heading={<h1 className="truncate text-base font-semibold text-ink-primary">{title}</h1>}
            endContent={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  className="hidden h-9 items-center gap-2 rounded-md border border-hairline bg-surface-raised px-3 text-sm text-ink-muted transition-colors hover:bg-surface-lifted hover:text-ink-primary sm:flex"
                >
                  <Search size={15} aria-hidden="true" />
                  <span>Search commands</span>
                  <kbd className="ml-2 rounded border border-hairline bg-surface-lifted px-1.5 py-0.5 text-xs text-ink-muted">
                    &#8984;K
                  </kbd>
                </button>
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  aria-label="Search commands"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface-raised text-ink-secondary transition-colors hover:bg-surface-lifted hover:text-ink-primary sm:hidden"
                >
                  <Search size={16} aria-hidden="true" />
                </button>
                {canCreate ? <QuickCreateMenu /> : null}
                {canViewMoney ? <NotificationBell /> : null}
                <ThemeToggle />
                <UserButton />
              </div>
            }
          />
        }
        sideNav={
          <SideNav
            header={<SideNavHeading heading="Aernova" headingHref="/today" subheading={companyName} />}
            collapsible={{
              isCollapsed,
              onCollapsedChange: setSideNavCollapsed,
              hasButton: false,
              buttonLabel: isCollapsed ? "Expand navigation" : "Collapse navigation",
            }}
            footerIcons={<SideNavCollapseButton />}
          >
            {navContent}
          </SideNav>
        }
        mobileNav={{
          isOpen: mobileNavOpen,
          onOpenChange: setMobileNavOpen,
          hasToggle: false,
          breakpoint: "lg",
          content: (
            <MobileNav
              isOpen={mobileNavOpen}
              onOpenChange={setMobileNavOpen}
              header={
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Aernova</p>
                  <p className="text-xs text-ink-muted">
                    {companyName} &middot; {displayName}
                  </p>
                </div>
              }
            >
              {overflowGroups.length > 0 ? (
                overflowGroups.map(({ group, items }) => (
                  <SideNavSection key={group.id} title={group.label}>
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <SideNavItem
                          key={item.id}
                          label={item.label}
                          href={item.href}
                          isSelected={item.id === activeId}
                          icon={<Icon size={17} strokeWidth={1.75} aria-hidden="true" />}
                        />
                      );
                    })}
                  </SideNavSection>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-ink-muted">
                  Everything you can reach is already in the bottom bar.
                </p>
              )}
            </MobileNav>
          ),
        }}
      >
        <div id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-x-hidden p-4 pb-24 outline-none md:p-6 lg:pb-6">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">{children}</div>
        </div>
      </AppShell>

      <MobileBottomNav items={primaryMobileItems} activeId={activeId} onMore={() => setMobileNavOpen(true)} />
      <CommandPaletteShell isOpen={commandOpen} onOpenChange={setCommandOpen} role={role} />
    </LinkProvider>
  );
}
