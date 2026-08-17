import { test } from "@playwright/test";
import { setTheme, disableMotion, VIEWPORTS, expectFullPageScreenshot } from "./helpers";

// Unauthenticated — no storageState. Onboarding is intentionally not
// covered here: the fixture company is already onboarded (see
// seed-visual-test-company.mjs), and provisioning a second, not-yet-
// onboarded test company solely to screenshot /onboarding was judged not
// worth the added fixture complexity for this pass.

test.describe("entry (auth)", () => {
  test("sign-in desktop dark", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "sign-in-desktop-dark.png");
  });

  test("sign-in mobile", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "sign-in-mobile.png");
  });
});
