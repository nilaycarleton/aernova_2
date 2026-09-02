import type { Page } from "@playwright/test";

/** Matches lib/theme-store.ts's THEME_STORAGE_KEY exactly. */
const THEME_STORAGE_KEY = "aernova-theme";

/**
 * Sets the theme before first paint via localStorage, same mechanism
 * app/layout.tsx's own inline flash-prevention script reads — so a
 * screenshot never captures a dark->light (or vice versa) flash.
 */
export async function setTheme(page: Page, theme: "dark" | "light") {
  await page.addInitScript((value) => {
    window.localStorage.setItem("aernova-theme", value);
  }, theme);
}

export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  smallDesktop: { width: 1024, height: 900 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
} as const;

/** Freezes CSS animations/transitions so a screenshot never lands mid-motion. */
export async function disableMotion(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
}

/**
 * `toHaveScreenshot(..., { fullPage: true })` resizes the viewport to the
 * full document height *after* the page already rendered at the original
 * viewport, then recaptures. On tall pages that resize can outrun Chromium's
 * repaint — confirmed directly (not assumed): the same page given a tall
 * viewport *before* navigation renders completely, while a post-load resize
 * intermittently leaves a real, populated DOM region unpainted (solid
 * ground-color void) in the composited screenshot. A short settle wait
 * after the resize is the standard mitigation. Route through this helper
 * (never call toHaveScreenshot directly) so every spec gets it.
 */
export async function expectFullPageScreenshot(page: Page, name: string) {
  const { expect } = await import("@playwright/test");
  // A same-viewport resize-after-render isn't enough on its own — verified
  // directly, repeatedly: real, populated DOM content can still composite
  // as a blank void in the final screenshot even after the resize settles,
  // and even after page.reload() at the new size. Only a fresh page.goto()
  // (not reload()) at the already-tall viewport reproduces the one method
  // confirmed reliable across repeated runs (identical output byte size
  // each time) — reload() apparently carries over some paint/compositing
  // state a fresh navigation doesn't.
  const viewport = page.viewportSize();
  if (viewport) {
    // The authenticated shell is an app-shell layout — <html>/<body> are
    // height-clamped with their own overflow, and the real content lives in
    // an internally-scrolling #main-content (confirmed directly:
    // documentElement.scrollHeight reads back the *viewport* height, 900,
    // not the page's actual content height; #main-content's own
    // scrollHeight is what actually reflects it). Public/auth pages have no
    // #main-content and do scroll normally, so documentElement still
    // covers those. Take the max of everything plausible.
    const fullHeight = await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        document.getElementById("main-content")?.scrollHeight ?? 0
      )
    );
    if (fullHeight > viewport.height) {
      const url = page.url();
      await page.setViewportSize({ width: viewport.width, height: fullHeight });
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await disableMotion(page);
      // toHaveScreenshot's own fullPage:true does its own resize-to-content
      // pass regardless of the current viewport, re-triggering the exact
      // paint bug this function exists to avoid. The viewport is already
      // sized to the full document height above, so a plain (non-fullPage)
      // capture is already the whole page — verified byte-identical across
      // repeated runs, where fullPage:true was not.
      await expect(page).toHaveScreenshot(name, { fullPage: false });
      return;
    }
  }
  await expect(page).toHaveScreenshot(name, { fullPage: true });
}

export { THEME_STORAGE_KEY };
