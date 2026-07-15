import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/sentry-init";

// Runs in the browser before the app becomes interactive (Next 16 client
// instrumentation contract).
initSentry();

// Lets Sentry attribute errors to the client-side route transition that was
// in progress when they occurred. Sentry requires this export by name.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
