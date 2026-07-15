import { initSentry } from "@/lib/sentry-init";

// Runs in the browser before the app becomes interactive (Next 16 client
// instrumentation contract). No exports required — the side effect is the point.
initSentry();
