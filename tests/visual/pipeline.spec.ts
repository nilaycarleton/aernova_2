import { test } from "@playwright/test";
import { STORAGE_STATE } from "./storage-state";
import { setTheme, disableMotion, VIEWPORTS, expectFullPageScreenshot } from "./helpers";

test.use({ storageState: STORAGE_STATE });

test.describe("requests / pipeline", () => {
  test("requests desktop dark", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/requests");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "requests-desktop-dark.png");
  });

  test("pipeline desktop dark (horizontal board)", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "pipeline-desktop-dark.png");
  });

  test("pipeline mobile (vertical stage-list path)", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "pipeline-mobile.png");
  });
});
