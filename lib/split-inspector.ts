/**
 * The SplitInspector breakpoint doctrine (Premium UI Redesign Phase 3, Step
 * 16). The desktop shell itself switches to a persistent sidebar at exactly
 * `AppShellBreakpoint="lg"` (1024px — see components/dashboard/shell/
 * shell-chrome.tsx). Splitting the inspector at that same number leaves the
 * main pane too narrow the instant the shell sidebar is also expanded, so
 * the content-layout breakpoint is deliberately set past it, not on it (the
 * plan explicitly warns against forcing 1024 just because the shell does).
 * Verified live at 390/768/1024/1440/1728 — see
 * docs/PREMIUM_UI_PHASE_3_IMPLEMENTATION.md for the observed behavior at
 * each width. Below this width the inspector opens as a Dialog sheet
 * instead of a cramped second column.
 */
export const SPLIT_INSPECTOR_BREAKPOINT_PX = 1280;

export function isSplitViewport(widthPx: number): boolean {
  return widthPx >= SPLIT_INSPECTOR_BREAKPOINT_PX;
}
