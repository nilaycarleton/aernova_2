# Aernova

Jobs, scheduling, quoting, and invoicing for trades contractors — Canadian,
multi-trade, with drone-based aerial roof measurement as a premium add-on.
Roofing is the wedge; the platform underneath is trade-agnostic (see
[`docs/PRODUCT.md`](./docs/PRODUCT.md) for who this is actually for and why).

**Stack**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Prisma 6
+ Postgres, Clerk (auth), Tailwind 4. Optional integrations degrade
gracefully when unconfigured: Stripe Connect (payments), Resend (email),
Anthropic (AI features), Sentry (error monitoring), S3/Cloudflare R2
(storage), NodeODM (drone photogrammetry).

## Quick start

Prerequisites: Node 24, and either the bundled local Postgres (below) or your
own Postgres 15+ instance.

```bash
npm install                    # postinstall runs `prisma generate`
cp .env.example .env           # fill in at least DATABASE_URL + Clerk keys, see below
npm run db:start                # starts the bundled local Postgres on :5433
npx prisma migrate deploy       # applies the schema (see "Database" below)
npm run db:seed                 # optional: sample data to look at immediately
npm run dev                     # http://localhost:3000
```

Sign up through the app's own `/sign-up` page (Clerk). The first sign-in
auto-provisions a company for you as its owner, seeds a starter price list
and tax rate, and sends you to a one-time `/onboarding` step to confirm your
real trade and province.

### Environment variables

`.env.example` is the source of truth — copy it to `.env` and read the
comment above each variable; every one explains what breaks (or gracefully
doesn't) without it. At minimum for local dev you need `DATABASE_URL` and
the two `CLERK_*` keys; everything else is optional and the app tells you
in the UI when a feature is unavailable rather than failing to build or run.

### Database

This repo uses `prisma migrate`, not `db push` — real migration history,
committed under `prisma/migrations/`. Day to day:

- `npx prisma migrate dev` — create/apply a migration after changing
  `prisma/schema.prisma`. Commit the generated migration folder.
- `npx prisma migrate deploy` — apply pending migrations without generating
  new ones (what a fresh clone, CI, or a production deploy runs).
- `npm run db:push` still exists for fast local-only schema iteration before
  you're ready to commit a real migration, but never run it against a
  database anything else depends on — it can silently drop data on a column
  or table rename.

`npm run db:seed` (sample company + jobs) and `npm run db:seed-catalog`
(just the starter price list, if you ever need to re-run it for an existing
company) are both idempotent — safe to run again.

### Local Postgres gotcha (macOS)

`npm run db:start` sets `LC_ALL`/`LANG` before starting `pg_ctl` — Postgres
18 on macOS fails to start ("postmaster became multithreaded") without a
locale set. If you're scripting around this directly instead of using the
npm script, you'll need the same env vars.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm test` | Runs `tests/*.test.ts` under Node's built-in test runner — no build step, no mocking framework. Pure logic only; nothing that needs a live DB or browser is unit-tested here (see "Testing" below) |
| `npm run lint` | ESLint, scoped to `app`, `components`, `lib` |
| `npx tsc --noEmit` | Type-check without emitting |
| `npm run db:start` / `db:stop` / `db:status` | Manage the bundled local Postgres |

CI (`.github/workflows/ci.yml`) runs all four — test, typecheck, lint,
build — on every push and PR. `npm run build` needs zero environment
variables to succeed (every integration is optional and checked at
runtime), so CI doesn't configure any secrets.

## Testing

Two different things are both called "testing" in this repo and are not
interchangeable:

- **`npm test`** covers pure functions only — money math, tax rates, date/
  timezone handling, permission checks, and similar. Deliberately excludes
  anything touching Prisma, Clerk, or the DOM, so it runs in under two
  seconds with `node --experimental-strip-types`, no build step.
- **Everything else** (auth flows, server actions, full pages, the 3D
  viewer) is verified live, in a real signed-in browser session against the
  local dev server — there's no Clerk session to fake from `curl`, and no
  E2E framework installed. If you're making a change in this territory,
  actually click through it locally before calling it done.

## Where to look next

- [`docs/PRODUCT.md`](./docs/PRODUCT.md) — who this is for, the product
  strategy.
- [`docs/DESIGN.md`](./docs/DESIGN.md) — the visual system: tokens,
  components, conventions. Read before touching any user-facing UI.
- [`docs/PLAN-CRM.md`](./docs/PLAN-CRM.md) — the full build roadmap and the
  product decisions behind it, phase by phase.
- [`docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md`](./docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md) —
  the next round of workflow decisions (change orders, warranty, progress
  tracking, workflow customization) on top of the CRM roadmap above.
- [`AGENTS.md`](./AGENTS.md) — a note for AI coding agents about this
  particular Next.js version's breaking changes vs. training-data defaults.
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — what's needed to actually
  deploy this (Vercel target, secrets rotation, migration deploy step,
  post-deploy checks).

## Photogrammetry worker (NodeODM)

Optional. Without `NODEODM_URL` set, "Process 3D model" uses a built-in
draft model package instead of a real reconstruction — fine for local
development without a worker running.

```bash
NODEODM_URL=http://127.0.0.1:3000
NODEODM_TOKEN=
# Optional worker options as JSON:
NODEODM_OPTIONS_JSON='[{"name":"gltf","value":true},{"name":"dsm","value":true},{"name":"dtm","value":true},{"name":"pc-quality","value":"high"}]'
```

When configured, "Process 3D model" uploads the job's imagery to NodeODM,
stores the task UUID on the model imagery record, and "Sync worker"
refreshes status. A completed task's full archive and individual assets
(mesh, point cloud, orthomosaic, DEM, report) are available through
`/api/jobs/:jobId/processing/:imageryId/download?asset=all`.
