import { test } from "@playwright/test";
import { disableMotion, VIEWPORTS, expectFullPageScreenshot } from "./helpers";
import { fixtureTokens } from "./fixtures/lookup";

// Public documents carry no app shell and no theme toggle — paper mode is
// pinned light regardless of app theme (docs/DESIGN.md's Dark-Instrument/
// paper-token doctrine), so these run with the default (unauthenticated)
// context and no setTheme() call.

let tokens: Awaited<ReturnType<typeof fixtureTokens>>;

test.beforeAll(async () => {
  tokens = await fixtureTokens();
});

test.describe("public documents (paper mode)", () => {
  test("public quote desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/q/${tokens.quote}`);
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "public-quote-desktop.png");
  });

  test("public quote mobile", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(`/q/${tokens.quote}`);
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "public-quote-mobile.png");
  });

  test("public invoice desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/i/${tokens.invoice}`);
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "public-invoice-desktop.png");
  });

  test("public change order desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/co/${tokens.changeOrder}`);
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "public-change-order-desktop.png");
  });

  test("public warranty desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/w/${tokens.warranty}`);
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "public-warranty-desktop.png");
  });

  test("public quote invalid token (error boundary)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/q/NOTAREALTOKEN-00000-00000-00000");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "public-quote-invalid-token.png");
  });

  test("client hub desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/hub/${tokens.hub}`);
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "client-hub-desktop.png");
  });
});
