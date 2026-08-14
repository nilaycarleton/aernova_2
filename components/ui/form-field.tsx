"use client";

import { TextArea } from "@astryxdesign/core/TextArea";
import type { ComponentProps } from "react";
import { characterCounterState, characterCounterText } from "@/lib/char-counter";

/**
 * The approved Astryx-backed form-field pattern (Step 18/42): use Astryx
 * TextInput/TextArea/Selector/CheckboxInput/RadioList directly wherever
 * possible (Decision A) — their `status`/`Field` machinery already covers
 * label/help/error/disabled/readonly. This file adds exactly the one thing
 * Astryx doesn't have: a min/max character-counter status message, composed
 * as a `status` prop rather than a new field-wrapper component.
 *
 * KNOWN ISSUE, carried forward from Phase 1 (docs/PREMIUM_UI_PHASE_1_
 * IMPLEMENTATION.md §45.2): Astryx FieldStatus (rendered by TextInput/
 * TextArea's `status` prop) has a pre-existing SSR/CSR hydration class-name
 * mismatch, upstream in @astryxdesign/core@0.3.0. Non-blocking — content is
 * correct post-hydration — and not fixed by swizzling here either, same
 * conclusion Phase 1 reached: it's a cosmetic upstream hydration warning,
 * not an Aernova bug, worth an upstream issue rather than a local patch.
 * This component is only the second production-adjacent place that
 * exercises TextArea's `status` prop (after `/internal/design-system`), so
 * expect the same warning on first render wherever it's used.
 */
export function CounterTextArea({
  min,
  max,
  value,
  onChange,
  counterText,
  ...props
}: Omit<ComponentProps<typeof TextArea>, "status" | "value" | "onChange"> & {
  min: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
  /** Pass a domain-specific counter (e.g. lib/invoice/addon-override.ts's `overrideNoteCounterText`) so existing copy isn't duplicated; defaults to lib/char-counter.ts's generic doctrine. */
  counterText?: (length: number) => string;
}) {
  const length = value.trim().length;
  const state = characterCounterState(length, min, max);
  const text = counterText ? counterText(length) : characterCounterText(length, min, max);

  return (
    <TextArea
      {...props}
      value={value}
      onChange={(next) => onChange(next)}
      status={{
        type: state === "in-range" ? "success" : state === "over" ? "error" : "warning",
        message: text,
      }}
    />
  );
}
