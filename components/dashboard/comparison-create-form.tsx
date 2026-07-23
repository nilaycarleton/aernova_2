"use client";

import { useActionState } from "react";
import {
  createRoofComparisonAction,
  type ComparisonFormState,
} from "@/app/(dashboard)/projects/[projectId]/phase-six-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { FieldError, errorAttrs } from "@/components/dashboard/form-feedback";

type PhotoOption = { id: string; url: string; fileName: string | null };

const SELECT =
  "rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-blue-400";

export function ComparisonCreateForm({
  projectId,
  beforeImages,
  afterImages,
}: {
  projectId: string;
  beforeImages: PhotoOption[];
  afterImages: PhotoOption[];
}) {
  const [state, formAction] = useActionState<ComparisonFormState, FormData>(
    createRoofComparisonAction,
    {}
  );
  const titleError = state.fieldErrors?.title;

  return (
    <form action={formAction} className="mt-4 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="md:col-span-2">
        <input
          name="title"
          placeholder="e.g. Front slope — before and after"
          className={`w-full rounded-xl border bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted ${titleError ? "border-rose-400 focus:border-rose-300" : "border-hairline focus:border-blue-400"}`}
          required
          {...errorAttrs("comparison-title", titleError)}
        />
        <FieldError fieldId="comparison-title" message={titleError} />
      </div>
      <select name="beforeUrl" defaultValue="" className={SELECT}>
        <option value="">Choose a &quot;before&quot; photo</option>
        {beforeImages.map((item) => (
          <option key={item.id} value={item.url}>
            {item.fileName ?? "Before photo"}
          </option>
        ))}
      </select>
      <select name="afterUrl" defaultValue="" className={SELECT}>
        <option value="">Choose an &quot;after&quot; photo</option>
        {afterImages.map((item) => (
          <option key={item.id} value={item.url}>
            {item.fileName ?? "After photo"}
          </option>
        ))}
      </select>
      <textarea
        name="summary"
        rows={2}
        placeholder="Optional note"
        className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400 md:col-span-2"
      />
      <SubmitButton
        pendingText="Creating…"
        className="rounded-2xl border border-instrument-bright/30 bg-instrument/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-instrument/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument disabled:opacity-40 md:col-span-2"
      >
        Create comparison
      </SubmitButton>
    </form>
  );
}
