import { test } from "@playwright/test";
import { STORAGE_STATE } from "./storage-state";
import { setTheme, disableMotion, VIEWPORTS, expectFullPageScreenshot } from "./helpers";

test.use({ storageState: STORAGE_STATE });

test.describe("authenticated shell / dashboard", () => {
  test("dashboard desktop dark", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "dashboard-desktop-dark.png");
  });

  test("dashboard desktop light", async ({ page }) => {
    await setTheme(page, "light");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "dashboard-desktop-light.png");
  });

  test("authenticated mobile shell (bottom nav, no sidebar stack)", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/today");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "shell-mobile.png");
  });

  test("desktop shell collapsed sidebar", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const collapseButton = page.getByRole("button", { name: /collapse sidebar/i });
    if (await collapseButton.isVisible().catch(() => false)) {
      // A real click (even with force: true) can still be swallowed by the
      // Next.js dev-mode indicator overlay (nextjs-portal — absent from a
      // production build) if it's the topmost element at those screen
      // coordinates. Dispatching the DOM click directly sidesteps
      // coordinate-based interception entirely; the React onClick handler
      // itself doesn't care how it was invoked.
      await collapseButton.evaluate((el: HTMLElement) => el.click());
      // Wait for the resulting re-render (useSyncExternalStore -> SideNav
      // collapse) rather than screenshotting mid-transition — the button's
      // own accessible name is the deterministic signal that it landed.
      await page.getByRole("button", { name: /expand sidebar/i }).waitFor({ state: "visible" });
    }
    await disableMotion(page);
    // Viewport-only, deliberately: this page's content is short enough that
    // fullPage vs viewport doesn't matter, and it sidesteps the same
    // post-load-resize repaint timing expectFullPageScreenshot works around.
    await test.expect(page).toHaveScreenshot("shell-desktop-collapsed.png", { fullPage: false });
  });
});
