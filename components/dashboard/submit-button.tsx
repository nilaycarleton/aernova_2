"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * A form submit button that automatically shows a pending state while the
 * server action runs, so users get feedback on slow/irreversible actions.
 * Must be rendered inside the <form> whose submission it reflects.
 */
export function SubmitButton({
  children,
  pendingText,
  disabled,
  title,
  className,
}: {
  children: ReactNode;
  pendingText: string;
  disabled?: boolean;
  title?: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} title={title} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
