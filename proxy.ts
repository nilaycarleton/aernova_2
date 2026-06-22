import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that do not require a signed-in user. Everything else
// (dashboard, projects, API routes) is protected.
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

// Next 16 renamed the `middleware` file convention to `proxy`. Clerk's
// middleware works the same way; exporting it as the default `proxy` function
// lets Clerk run on every matched request so `auth()` is available downstream.
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
