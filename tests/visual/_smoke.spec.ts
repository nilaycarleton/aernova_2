import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./storage-state";

test.describe("unauthenticated", () => {
  test("dev server responds and redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("authenticated", () => {
  test.use({ storageState: STORAGE_STATE });

  test("the visual-test user reaches an authenticated route", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/today/);
    await expect(page.locator("body")).not.toContainText("Sign in");
  });
});
