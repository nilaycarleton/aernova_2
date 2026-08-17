import { test as setup } from "@playwright/test";
import { clerkSetup, clerk } from "@clerk/testing/playwright";
import { STORAGE_STATE } from "./storage-state";

/**
 * Produces one authenticated storageState reused by every authenticated
 * visual spec (Playwright's documented "setup project" pattern) — one real
 * sign-in per run, not once per spec file. Uses @clerk/testing's official
 * Playwright integration (ticket-based email sign-in via the Clerk Backend
 * API, no bot-check bypass hacks, no production auth code touched) against
 * a dedicated test user created for this suite — see
 * tests/visual/fixtures/seed-visual-test-company.mjs for how that user and
 * its company/job/client/request fixtures are provisioned.
 */
setup("authenticate as the visual-test user", async ({ page }) => {
  await clerkSetup();

  const email = process.env.VISUAL_TEST_CLERK_EMAIL;
  if (!email) {
    throw new Error(
      "VISUAL_TEST_CLERK_EMAIL is not set — source .env.playwright.local before running the visual suite."
    );
  }

  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/today");
  await page.waitForURL(/\/today/);

  await page.context().storageState({ path: STORAGE_STATE });
});
