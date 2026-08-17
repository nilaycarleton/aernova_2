import { test } from "@playwright/test";
import { STORAGE_STATE } from "./storage-state";
import { setTheme, disableMotion, VIEWPORTS, expectFullPageScreenshot } from "./helpers";
import { FIXTURE_JOB_IN_PROGRESS_ID } from "./fixtures/lookup";

test.use({ storageState: STORAGE_STATE });

test.describe("jobs", () => {
  test("jobs list desktop dark", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/jobs");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "jobs-list-desktop-dark.png");
  });

  test("jobs list mobile", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/jobs");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "jobs-list-mobile.png");
  });

  test("job workspace desktop dark (split inspector)", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/jobs/${FIXTURE_JOB_IN_PROGRESS_ID}`);
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "job-workspace-desktop-dark.png");
  });

  test("job workspace desktop light", async ({ page }) => {
    await setTheme(page, "light");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/jobs/${FIXTURE_JOB_IN_PROGRESS_ID}`);
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "job-workspace-desktop-light.png");
  });

  test("job workspace mobile (inspector as sheet trigger)", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(`/jobs/${FIXTURE_JOB_IN_PROGRESS_ID}`);
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "job-workspace-mobile.png");
  });

  test("new job form", async ({ page }) => {
    await setTheme(page, "dark");
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/jobs/new");
    await page.waitForLoadState("networkidle");
    await disableMotion(page);
    await expectFullPageScreenshot(page, "job-new-desktop-dark.png");
  });
});
