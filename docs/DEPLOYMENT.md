# Deploying Aernova

A checklist for the first real deploy, not something to run through casually.
Host is Vercel; nothing here happens automatically — each step is a decision
or an action for whoever's doing the deploy.

## What's already done (code-level, in this repo)

- **CSP, security headers.** `proxy.ts` sets a real Content-Security-Policy
  via Clerk's own `contentSecurityPolicy: { strict: true }` (nonce +
  `strict-dynamic`, not the loose `https: http: unsafe-inline` fallback).
  `next.config.ts` sets `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` (camera/mic/geolocation all denied
  — nothing in the app uses the JS APIs for them), and HSTS. Verified live
  against dashboard, quote builder, settings, and the public `/q/[token]`
  page with zero CSP violations in console.
- **`CRON_SECRET` gating.** The three `/api/cron/*` routes already check for
  it; documented in `.env.example`. **Still needs to actually be set** — see
  below.
- **`vercel.json`** wires the three cron routes to Vercel Cron on the
  schedules their own doc comments specify (daily for the two reminder
  sweeps, hourly for the NodeODM sync). Vercel Cron auto-sends `CRON_SECRET`
  as `Authorization: Bearer <value>` once the env var is set on the
  project — no extra wiring needed on that end.
- **Migration history established.** `prisma/migrations/0_init` baselines
  the *current* schema exactly (verified zero drift against the dev DB
  before baselining). `npm run vercel-build` runs `prisma migrate deploy`
  before `next build` — Vercel auto-detects and uses this script name
  instead of the default `build`, so this needs no manual dashboard
  configuration. Going forward, schema changes go through `npm run
  db:migrate` (`prisma migrate dev`) locally, committing the generated
  migration folder, same as any other Prisma project from here on.

  **Deliberately not done yet** (confirmed with the user): the physical
  tables are still named `Project`/`Proposal` under `@@map` from the
  pre-pivot rename, and `Job.clientName`/address are still around as
  deprecated columns. Cleaning both up is a real migration of its own,
  meant to happen once this baseline has been live a while, not bundled
  into establishing it.

## What still needs a human, before going live

### 1. Provision a production Postgres database
Nothing here yet — local dev uses a bundled Postgres on port 5433, which
obviously doesn't exist in production. Pick one: Vercel Postgres (tightest
Vercel integration), Neon, Supabase, or Railway are all fine, standard
choices for a Next.js app on Vercel. Whichever one, get its connection
string ready for `DATABASE_URL` below.

### 2. Rotate every secret to a production value
None of what's in the local `.env` should reach production as-is — it's all
test-mode/dev-mode. In the order you'll actually need them:

| Variable | What to do |
|---|---|
| `DATABASE_URL` | From step 1. |
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Create a **production** Clerk instance (Clerk dashboard → your app → switch from Development to Production, or create a new instance) — dev and prod Clerk instances have different user pools, so existing dev sign-ups won't carry over. Update the CSP will auto-adjust: the frontend API host is parsed from the publishable key at runtime, nothing to touch in code. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `SIGN_UP_URL` | Same values as dev (`/sign-in`, `/sign-up`) — these don't change. |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | Switch the same Stripe account from Test mode to Live mode (dashboard.stripe.com), or use a live-mode Connect app if this was built under a separate one. Every contractor who connected a **test**-mode Express account under the old keys will need to reconnect under live keys — that's a real, visible event for existing users, not silent. |
| `STRIPE_WEBHOOK_SECRET` | New value — the live-mode webhook endpoint (`https://<your-domain>/api/webhooks/stripe`) gets its own signing secret, separate from the one `stripe listen` gave you locally. |
| `ANTHROPIC_API_KEY` | Can likely stay the same key (Anthropic doesn't separate test/live), but worth confirming it has production-appropriate rate limits/spend controls set on the Anthropic Console. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Verify a real sending domain in Resend if not already done — `RESEND_FROM_EMAIL` must be on that verified domain, not a placeholder. |
| `NEXT_PUBLIC_SENTRY_DSN` | Create a Sentry project (or reuse one), get its DSN. Set `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` too if you want real stack traces instead of minified ones. |
| `CRON_SECRET` | Generate with `openssl rand -hex 32`. Set the *same* value in Vercel's env vars — that's what makes Vercel Cron's auto-sent Bearer token match what the routes check for. |
| `STORAGE_DRIVER` + `S3_*` | Local storage (`public/uploads`) doesn't survive Vercel's ephemeral filesystem across deploys — **this one isn't optional the way the others are a "should."** Set `STORAGE_DRIVER=s3` with a real bucket (S3 or Cloudflare R2) before going live, or uploaded photos will vanish on the next deploy. |

### 3. Set env vars on the Vercel project, then deploy
Once the table above is filled in: create the Vercel project (link this
GitHub repo), paste every variable into Project Settings → Environment
Variables (Production environment), then deploy. `vercel-build` handles
`prisma migrate deploy` automatically — no separate manual migration step.

### 4. Verify after the first deploy
- Sign up as a fresh user, confirm the Clerk production flow works end to
  end and a company gets provisioned.
- Check Vercel's Cron dashboard (Project → Cron Jobs) shows all three jobs
  registered on the expected schedules.
- Trigger a Stripe test payment in live mode with a real (small) card, or at
  minimum confirm the Connect onboarding flow completes and the webhook
  fires (check Stripe dashboard → Developers → Webhooks → recent deliveries).
- Confirm an uploaded photo survives a redeploy (proves S3/R2 is actually
  wired, not silently still on local storage).
- Open the browser console on a few pages, confirm no CSP violations (same
  check already done locally — worth repeating once real production
  origins, not dev ones, are in play).

## Rollback

**Rolling back application code alone, without also rolling back the database
schema, is not safe by default.** This was rehearsed once, in an isolated git
worktree that never touched a real database: checking out an earlier commit
and type-checking it against the *current* branch's generated Prisma client
surfaced a real incompatibility — the older commit's `lib/request-status.ts`
was missing a `CONTACTED` status entry that the current Prisma-generated types
require. Older application code and a newer database schema are not freely
interchangeable, at least not across every commit pair; the reverse
(rolling the schema back too) has not been separately verified either.

Whether a specific rollback is safe depends on whether every migration
between the two commits was purely additive (new nullable columns, new enum
values with no removed ones, new tables) or contained a destructive/renaming
change. There is no automated check for this yet — read the migration
folders (`prisma/migrations/`) between the target commit and the current one
before assuming a rollback is safe.

Practically, before rolling back a real deployment:

1. Diff `prisma/migrations/` between the deployed commit and the rollback
   target. If every migration in that range only adds nullable columns,
   tables, or enum values, code-only rollback (via Vercel's "promote a
   previous deployment" or `vercel rollback`) is likely safe.
2. If any migration in that range drops/renames a column or table, or adds a
   `NOT NULL` column without a default, roll back the schema too (a
   compensating migration, or a database restore) — do not roll back the
   application code alone against a schema it was never built against.
3. Vercel's own rollback mechanism (Project → Deployments → promote a
   previous deployment, or `vercel rollback`) only reverts the deployed
   application build. It has no awareness of the database schema and will
   not roll back or warn about a migration.

This has not yet been exercised against a real production deployment or a
real database rollback — Aernova has never been deployed to production as of
this writing. The above is the reviewed procedure for whoever performs the
first one, not a claim that it has been operationally tested end to end.

## Known follow-ups, not blockers

- **Prisma major version available** (6.19.3 → 7.9.1 as of this baseline).
  Worth doing eventually, deliberately not bundled into establishing the
  migration baseline — a major-version upgrade and "first migration ever"
  are each risky enough alone.
- **The `@@map` cleanup** mentioned above (rename `Project`→`Job`,
  `Proposal`→`Quote` at the table level, drop deprecated columns) — a real
  migration, do it once the baseline has been live and stable for a while.
- Everything in Tiers 1–5 of the pre-deploy audit that isn't Tier 0: trade
  selection hardcoded to ROOFING with no UI to change it, default tax rate
  gap, README still being create-next-app boilerplate, missing lint/build
  steps in CI, the stray worktree, no Terms of Service/Privacy Policy pages,
  and the smaller polish items (favicon/manifest, OG tags, robots.txt, skip
  link). Not re-listed in full here — ask for that list again if it's not
  still in scrollback.
