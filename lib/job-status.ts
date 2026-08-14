import { JobStatus } from "@prisma/client";
import type { StatusTone } from "@/lib/status-tone";

/**
 * The ordered job lifecycle a contractor moves a job through. ARCHIVED is
 * a terminal side-state reachable from anywhere, so it is not part of the flow.
 */
export const STATUS_FLOW: JobStatus[] = [
  JobStatus.LEAD,
  JobStatus.INSPECTION,
  JobStatus.PROCESSING,
  JobStatus.READY_FOR_QUOTE,
  JobStatus.QUOTED,
  JobStatus.SCHEDULED,
  JobStatus.IN_PROGRESS,
  JobStatus.COMPLETED,
];

export const ALL_STATUSES: JobStatus[] = [...STATUS_FLOW, JobStatus.ARCHIVED];

/**
 * Where a job stands is *state*, not a measurement — so it reads tonally rather
 * than in colour. These used to be nine raw palette hues (slate, sky, amber,
 * emerald, blue, indigo, violet, teal), which had three problems: raw utilities
 * don't flip with theme, amber is reserved for caution alone, and a nine-colour
 * rainbow competes with the one cyan figure a contractor is meant to find.
 *
 * Three tiers carry everything the rainbow did: in-flight, done, and put away.
 * The stage's *name* is already on the pill, so colour was never what told them
 * apart — it only added noise.
 */
const IN_FLIGHT = "text-ink-secondary bg-surface-lifted";
const COMPLETE = "text-confirm-fg bg-confirm/10";
const ARCHIVED_BADGE = "text-ink-muted bg-surface-lifted";

type StatusMeta = {
  label: string;
  /** What this stage means and what the contractor should do next. */
  description: string;
  /** Short, plain next action shown on cards, e.g. "Add drone photos". */
  nextStep: string;
  /** Verb for the "advance" button, e.g. "Mark inspected". */
  advanceLabel: string;
  /** Tailwind classes for a status badge. */
  badge: string;
};

export const STATUS_META: Record<JobStatus, StatusMeta> = {
  LEAD: {
    label: "Lead",
    description: "New opportunity. Confirm client details, then book an inspection.",
    nextStep: "Start an inspection",
    advanceLabel: "Start inspection",
    badge: IN_FLIGHT,
  },
  INSPECTION: {
    label: "Inspection",
    description: "Capture drone imagery and photos, and log any roof issues.",
    nextStep: "Add drone photos & log issues",
    advanceLabel: "Send to processing",
    badge: IN_FLIGHT,
  },
  PROCESSING: {
    label: "Processing",
    description: "Building the 3D model and extracting roof measurements.",
    nextStep: "Building the 3D model…",
    advanceLabel: "Measurements ready",
    badge: IN_FLIGHT,
  },
  READY_FOR_QUOTE: {
    label: "Ready for quote",
    description: "Measurements are in. Build the quote for the client.",
    nextStep: "Build the quote",
    advanceLabel: "Mark quoted",
    badge: IN_FLIGHT,
  },
  QUOTED: {
    label: "Quoted",
    description: "Quote sent. Follow up and confirm approval.",
    nextStep: "Follow up with the client",
    advanceLabel: "Schedule job",
    badge: IN_FLIGHT,
  },
  SCHEDULED: {
    label: "Scheduled",
    description: "Job is booked. Assign the crew and prepare materials.",
    nextStep: "Prep the crew & materials",
    advanceLabel: "Start work",
    badge: IN_FLIGHT,
  },
  IN_PROGRESS: {
    label: "In progress",
    description: "Crew is on site. Track progress to completion.",
    nextStep: "Track the job to completion",
    advanceLabel: "Mark completed",
    badge: IN_FLIGHT,
  },
  COMPLETED: {
    label: "Completed",
    description: "Job finished. Capture after photos and close out.",
    nextStep: "Add after photos & close out",
    advanceLabel: "Completed",
    badge: COMPLETE,
  },
  ARCHIVED: {
    label: "Archived",
    description: "Job is archived and hidden from the active pipeline.",
    nextStep: "Archived",
    advanceLabel: "Archived",
    badge: ARCHIVED_BADGE,
  },
};

export function statusLabel(status: JobStatus) {
  return STATUS_META[status]?.label ?? status.replaceAll("_", " ");
}

export function statusBadgeClass(status: JobStatus) {
  return STATUS_META[status]?.badge ?? IN_FLIGHT;
}

/**
 * Minimal Phase 4 adapter for the job workspace's PageHeader `status` slot
 * (the shared `Status` primitive, components/ui/status.tsx). `STATUS_META`
 * keeps owning label + the raw badge class Jobs-index still reads directly;
 * this only adds the same three-tier reading as a `StatusTone`, so the one
 * page that renders `Status` here doesn't hardcode an enum→tone map inline.
 * Not a rewrite of `STATUS_META` — see docs/PREMIUM_UI_PHASE_4_IMPLEMENTATION.md.
 */
export function statusTone(status: JobStatus): StatusTone {
  if (status === JobStatus.COMPLETED) return "success";
  return "neutral";
}

/** The next stage in the flow, or null if at the end / off-flow (ARCHIVED). */
export function nextStatus(status: JobStatus): JobStatus | null {
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1 || index === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}
