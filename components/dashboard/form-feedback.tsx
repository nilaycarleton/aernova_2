"use client";

/**
 * Shared inline-validation UI so every form reports problems the same way:
 * a red stroke on the field, a message below it, and colour never carrying the
 * message alone (WCAG 1.4.1). Server actions return field errors instead of
 * throwing — a thrown validation error unmounts the form and takes the user's
 * typing with it (see lib/*-validation and Next's error-handling guidance).
 */

const FIELD_BASE =
  "w-full rounded-xl border bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted";

/** Field classes with an error-aware border. Pass the field's error, if any. */
export function fieldClass(error?: string, extra = "") {
  const border = error
    ? "border-danger focus:border-danger"
    : "border-hairline focus:border-signal-blue";
  return `${FIELD_BASE} ${border} ${extra}`.trim();
}

/** Props to spread onto an input so it announces its own error to assistive tech. */
export function errorAttrs(fieldId: string, error?: string) {
  return {
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${fieldId}-error` : undefined,
  };
}

export function FieldError({ fieldId, message }: { fieldId: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${fieldId}-error`} className="mt-2 text-xs text-danger-fg">
      {message}
    </p>
  );
}

/**
 * A form-level error banner for a failed save (network/server), as opposed to
 * field validation. It names the problem and promises the typing survived, so
 * the roofer can just try again — the same contract as returned field errors.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger-fg"
    >
      {message} Nothing you typed has been lost.
    </div>
  );
}

/** The reassurance banner: names the count and promises nothing was lost. */
export function FormErrorSummary({ count, noun = "job" }: { count: number; noun?: string }) {
  if (count < 1) return null;
  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger-fg"
    >
      {count === 1
        ? `One thing needs fixing before we can save this ${noun}.`
        : `${count} things need fixing before we can save this ${noun}.`}{" "}
      Nothing you typed has been lost.
    </div>
  );
}
