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

type StatusMeta = {
  label: string;
  /** What this stage means and what the contractor should do next. */
  description: string;
  /** Short, plain next action shown on cards, e.g. "Add drone photos". */
  nextStep: string;
  /** Verb for the "advance" button, e.g. "Mark inspected". */
  advanceLabel: string;
};

export const STATUS_META: Record<JobStatus, StatusMeta> = {
  LEAD: {
    label: "Lead",
    description: "New opportunity. Confirm client details, then book an inspection.",
    nextStep: "Start an inspection",
    advanceLabel: "Start inspection",
  },
  INSPECTION: {
    label: "Inspection",
    description: "Capture drone imagery and photos, and log any roof issues.",
    nextStep: "Add drone photos & log issues",
    advanceLabel: "Send to processing",
  },
  PROCESSING: {
    label: "Processing",
    description: "Building the 3D model and extracting roof measurements.",
    nextStep: "Building the 3D model…",
    advanceLabel: "Measurements ready",
  },
  READY_FOR_QUOTE: {
    label: "Ready for quote",
    description: "Measurements are in. Build the quote for the client.",
    nextStep: "Build the quote",
    advanceLabel: "Mark quoted",
  },
  QUOTED: {
    label: "Quoted",
    description: "Quote sent. Follow up and confirm approval.",
    nextStep: "Follow up with the client",
    advanceLabel: "Schedule job",
  },
  SCHEDULED: {
    label: "Scheduled",
    description: "Job is booked. Assign the crew and prepare materials.",
    nextStep: "Prep the crew & materials",
    advanceLabel: "Start work",
  },
  IN_PROGRESS: {
    label: "In progress",
    description: "Crew is on site. Track progress to completion.",
    nextStep: "Track the job to completion",
    advanceLabel: "Mark completed",
  },
  COMPLETED: {
    label: "Completed",
    description: "Job finished. Capture after photos and close out.",
    nextStep: "Add after photos & close out",
    advanceLabel: "Completed",
  },
  ARCHIVED: {
    label: "Archived",
    description: "Job is archived and hidden from the active pipeline.",
    nextStep: "Archived",
    advanceLabel: "Archived",
  },
};

export function statusLabel(status: JobStatus) {
  return STATUS_META[status]?.label ?? status.replaceAll("_", " ");
}

/**
 * Adapter feeding the shared `Status` primitive (components/ui/status.tsx)
 * everywhere a job status renders — `STATUS_META` keeps owning the
 * human-facing label; this owns only the tone. See
 * docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_4_IMPLEMENTATION.md.
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
