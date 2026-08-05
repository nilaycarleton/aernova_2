"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * A submit button that asks first.
 *
 * `SubmitButton` with a question attached, so a destructive action inside a
 * *server*-rendered form can still be confirmed — a server component has no
 * `onSubmit` to hang one off, and the alternative is turning a whole page into
 * a client component to guard one button.
 *
 * The confirmation runs on click and cancels the submit, rather than on the
 * form, so the button owns its own question. Everything else — the pending
 * text, the disabled state — behaves exactly as `SubmitButton` does, because a
 * button that behaves differently depending on whether it is dangerous is a
 * button people learn twice.
 */
export function ConfirmSubmit({
  children,
  pendingText,
  question,
  className,
}: {
  children: ReactNode;
  pendingText: string;
  /** Said in full, including what happens if they say yes. */
  question: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
      className={className}
    >
      {pending ? pendingText : children}
    </button>
  );
}
