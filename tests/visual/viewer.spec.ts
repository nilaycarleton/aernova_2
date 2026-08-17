import { test } from "@playwright/test";
import { STORAGE_STATE } from "./storage-state";
import { setTheme, disableMotion, VIEWPORTS, expectFullPageScreenshot } from "./helpers";

/**
 * The fixture jobs (seed-visual-test-company.mjs) have no processed
 * photogrammetry model — that requires a real NodeODM run against real
 * drone imagery, well outside what a Playwright fixture can produce
 * deterministically. This spec honestly covers what's actually reachable:
 * the Scan tab's pre-model gating state (a real, valid, DESIGN.md-required
 * "empty" state — Step 35/36 of Phase 7's own record: "do not invent a
 * processing state if none exists"). A rendered, textured 3D canvas is not
 * claimed as covered here.
 */
test.use({ storageState: STORAGE_STATE });

test.describe("viewer (scan tab)", () => {
  test("job workspace scan tab, no model yet, desktop dark", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/jobs/visualtest_job_inprogress?tab=scan");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "viewer-scan-tab-no-model-desktop-dark.png");
  });
});
