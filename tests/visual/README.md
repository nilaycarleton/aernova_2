# Visual regression suite

Persistent, pixel-diff visual regression coverage for the Premium UI Redesign
(Playwright Test + `toHaveScreenshot`). Closes the "no persistent automated
visual-regression coverage" gap the final completion audit identified —
manual Chrome screenshots and the axe-core accessibility sweep (both still
valuable, both still used elsewhere) are not this, and were not claimed to
be.

## What this covers

Representative route families, not every route: authenticated shell/dashboard,
jobs (list + workspace), requests/pipeline (desktop board + mobile stage-list
fallback), field surfaces (today/schedule), clients, business (quotes,
invoices, change orders, reports), company (team/settings), all four public
documents plus the Client Hub (including an invalid-token error state), the
sign-in entry point, and the roof-viewer Scan tab's pre-model state. Dark and
light theme where the surface is meaningfully theme-sensitive; 390/768/1024/1440px
viewports across the set (not every route at every width — structural
transformations, per route family).

Onboarding is not covered (the fixture company is pre-onboarded; a second
company solely for one screenshot wasn't worth the fixture complexity).
Native 200% browser zoom and real mobile/tablet hardware remain manual
release checks — this suite runs one real engine (Chromium) at emulated
viewports, same honest limitation every prior phase of this redesign
documented.

## One-time setup

```sh
npm install                       # installs @playwright/test, @clerk/testing
npx playwright install chromium   # downloads the browser binary (no allowScripts change needed — verified: neither package has an install script)
```

Create `.env.playwright.local` (already gitignored via `.env*`) with a
dedicated test user — do not reuse a real personal Clerk account:

```
VISUAL_TEST_CLERK_USER_ID=user_...
VISUAL_TEST_CLERK_EMAIL=playwright-visual-test@example.com
```

Create that Clerk user once via the Backend API (needs `CLERK_SECRET_KEY` in
`.env`; this Clerk instance requires both an email and a phone number to
create a user — a synthetic number is fine, it's never actually SMS'd):

```js
await fetch("https://api.clerk.com/v1/users", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    email_address: ["playwright-visual-test@example.com"],
    phone_number: ["+15555550199"],
    username: "playwright_visual_test",
    password: "<a strong password — the suite signs in by email ticket, not password, so this is only ever an admin-created credential>",
    skip_password_checks: true,
  }),
});
```

Then seed that user into a dedicated demo company (never the real
personal/production company) with representative fixture data:

```sh
npm run test:visual:seed
```

## Running

```sh
npm run test:visual           # run the suite, compare against committed baselines
npm run test:visual:update    # regenerate baselines after an intentional visual change
```

`auth.setup.ts` runs once per invocation (a Playwright "setup project"),
signing in via `@clerk/testing`'s official ticket-based email sign-in — no
password prompt, no bot-check bypass hack, no production auth code touched —
and saves a `storageState` every authenticated spec reuses.

## Updating baselines

After an intentional visual change: run `npm run test:visual:update`,
**then manually look at the changed PNGs before committing** — a baseline is
not proof of correctness just because the tool wrote it. Check for exactly
the regression classes this pass itself was built to catch: clipping,
accidental horizontal scroll, wrong radius, wrong status tone, duplicate
headings, missing data, hidden actions, theme mistakes, document branding,
viewer framing.

## A real bug this harness found (worth knowing before you extend it)

`page.screenshot({ fullPage: true })` (and `expect(page).toHaveScreenshot`'s
own `fullPage: true`) resizes the viewport to `document.documentElement`'s
content height *after* the page already rendered — and on this app's
authenticated shell, that resize-after-render can silently composite a real,
populated region of the page as a blank void, even though the DOM is
correct and unpainted-content is genuinely present. Root cause, confirmed by
direct measurement: the shell is an app-shell layout — `<html>`/`<body>` are
height-clamped with their own `overflow`, so `documentElement.scrollHeight`
reports the *viewport* height, not the page's real content height; the
actual scrollable height lives on `#main-content`. `expectFullPageScreenshot()`
in `helpers.ts` works around both problems: it measures the max of
`documentElement`, `body`, and `#main-content` scrollHeight, resizes the
viewport to that *before* a fresh `page.goto()` (not `reload()` — verified
directly that reload() does not reliably fix the paint issue, a plain
`goto()` does), and then captures as a plain (non-`fullPage`) screenshot,
since the viewport is now already sized to the whole page. Always use this
helper for a new spec's screenshot call — never call `toHaveScreenshot`
directly on an authenticated route.

## CI

Not yet wired into GitHub Actions. This repo's `.github/workflows/` does not
exist yet (`npm run lint`/`build` aren't in CI either, per `docs/DEPLOYMENT.md`'s
own "known follow-ups" list) — adding visual-regression CI presupposes a CI
pipeline that doesn't exist yet, plus a decision about running Postgres +
seeded fixtures + a dedicated Clerk test user in that environment safely.
The suite itself is real, persistent, and rerunnable locally; CI integration
is a documented dependency, not a silent gap.
