import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that do not require a signed-in user. Everything else
// (dashboard, jobs, API routes) is protected. Cron endpoints are public to
// Clerk because they authenticate themselves with CRON_SECRET, not a user session.
// `/q/…` is a quote a homeowner was sent. They will never have an account here
// — the unguessable token in the URL is the credential (see lib/share-token.ts),
// and putting a sign-up wall in front of a roofing quote is how a contractor
// loses the job.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/cron(.*)",
  // Stripe calling us back. It authenticates with a signature over the raw
  // body (`STRIPE_WEBHOOK_SECRET`), not a Clerk session — Stripe has never
  // heard of Clerk and never will.
  "/api/webhooks/stripe(.*)",
  "/q/(.*)",
  // `/i/…` is an invoice, and it is public for exactly the reason `/q/…` is —
  // the same homeowner, the same absent account, the same token doing the same
  // job. Being asked to sign up before you can read what you owe is worse than
  // being asked before you can read a quote: it reads as a reason not to pay.
  "/i/(.*)",
  // The calendar feed. Google's and Apple's fetchers will never hold a session
  // — the token in the URL is the credential, same as a quote's.
  "/calendar/(.*)",
  // A crew member joining their boss's team. Public by necessity: the person
  // opening it does not have an account yet, which is the whole point of it.
  "/join/(.*)",
  // Item 44's Client Hub — the homeowner's one link to every quote, invoice,
  // visit and roof report across every job. Same reasoning as `/q/…`: the
  // token in the URL is the credential, and there is no account to sign
  // into. Missing from this list for one release (2026-08-04) — masked in
  // testing because the tab doing the testing was already signed in as the
  // contractor, so `auth.protect()` never actually got exercised.
  "/hub/(.*)",
  // Item 45's request-a-quote form. Public by design — the person filling it
  // in has never heard of Aernova and never will; they are doing business
  // with the contractor whose slug is in the URL.
  "/request/(.*)",
  // Legal pages. Anyone can read them without an account — a prospective
  // Contractor deciding whether to sign up, or a Client the request form
  // links out to, needs to reach these before they've ever authenticated.
  "/terms",
  "/privacy",
]);

// S3/R2 mode serves uploaded photos from this origin instead of the app's own
// (see lib/storage.ts) — img-src needs it too, or every uploaded photo would
// be blocked by the CSP below. Absent in local-storage mode, which serves
// from `/uploads` on the app's own origin and needs nothing extra.
const storageImgSrc = process.env.STORAGE_PUBLIC_BASE_URL ? [process.env.STORAGE_PUBLIC_BASE_URL] : [];

// Next 16 renamed the `middleware` file convention to `proxy`. Clerk's
// middleware works the same way; exporting it as the default `proxy` function
// lets Clerk run on every matched request so `auth()` is available downstream.
export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  {
    /**
     * Clerk generates the whole Content-Security-Policy header itself —
     * including its own frontend API host (parsed from the publishable key),
     * Stripe and Cloudflare Turnstile origins, and a per-request nonce it
     * both sends as a response header and forwards to the app as the
     * `x-nonce` request header (read in `app/layout.tsx` for the one inline
     * script this app has). `strict: true` is what makes that nonce actually
     * matter: without it Clerk's default script-src falls back to a bare
     * `https: http: unsafe-inline`, which is a CSP in name only. See
     * node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js
     * for the exact defaults being extended here, not guessed at.
     */
    contentSecurityPolicy: {
      strict: true,
      directives: {
        // Not one of Clerk's defaults — clickjacking protection, the modern
        // form of the X-Frame-Options header next.config.ts also sets.
        "frame-ancestors": ["none"],
        // Not one of Clerk's defaults — no <object>/<embed>/Flash-era plugin
        // has any legitimate reason to load here.
        "object-src": ["none"],
        // Not one of Clerk's defaults — stops a <base> tag injected via any
        // other vulnerability from silently redirecting every relative URL
        // on the page to an attacker's origin.
        "base-uri": ["self"],
        // The roof/model viewer (measure-viewer.tsx, hub-model-viewer.tsx)
        // loads GLB textures through THREE.GLTFLoader, which pulls each
        // embedded texture out of the binary as a Blob and hands GLTFLoader's
        // own texture loader a `blob:` URL for it (`URL.createObjectURL()`).
        // In Chrome that loader is THREE.ImageBitmapLoader, which fetches the
        // URL itself — governed by connect-src, not img-src. Without `blob:`
        // there every texture request is silently blocked and the model
        // renders geometry-only/white, with GLTFLoader logging "Couldn't
        // load texture" (the fetch() rejection, not a decode failure).
        // img-src also needs it: browsers where GLTFLoader falls back to the
        // <img>-based TextureLoader (Safari <17, Firefox <98) load the same
        // blob: URL as an image element instead, which img-src governs.
        // storageImgSrc is added on top, only in S3/R2 mode. Clerk unions
        // these with its own defaults rather than replacing them.
        "connect-src": ["blob:"],
        "img-src": ["blob:", ...storageImgSrc],
      },
    },
  }
);

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
