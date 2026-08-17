import { test } from "@playwright/test";
import { STORAGE_STATE } from "./storage-state";
import { setTheme, disableMotion, VIEWPORTS, expectFullPageScreenshot } from "./helpers";

test.use({ storageState: STORAGE_STATE });

test.describe("clients", () => {
  test("clients list desktop dark", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "clients-desktop-dark.png");
  });

  test("client detail desktop dark", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/clients/visualtest_client_maple");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "client-detail-desktop-dark.png");
  });
});
