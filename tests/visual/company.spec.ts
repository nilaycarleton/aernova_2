import { test } from "@playwright/test";
import { STORAGE_STATE } from "./storage-state";
import { setTheme, disableMotion, VIEWPORTS, expectFullPageScreenshot } from "./helpers";

test.use({ storageState: STORAGE_STATE });

test.describe("company (team / settings)", () => {
  test("team desktop dark", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/team");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "team-desktop-dark.png");
  });

  test("settings desktop dark", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "settings-desktop-dark.png");
  });

  test("settings desktop light", async ({ page }) => {
    await setTheme(page, "light");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "settings-desktop-light.png");
  });
});
