import { defineConfig, devices } from "@playwright/test";

/**
 * Persistent visual-regression harness (Premium UI Redesign final audit,
 * Blocker 1). Screenshots are compared against committed baselines in
 * tests/visual/*.spec.ts-snapshots/ — a genuine pixel diff fails the run.
 *
 * Runs against the real dev server (Turbopack), never a mock/stub app —
 * `webServer` below starts it automatically for both local runs and CI.
 */
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      // A few px of AA/subpixel drift is normal across runs on the same
      // machine; this is not a license to hide real layout regressions.
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "off",
    video: "off",
    colorScheme: "dark",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
