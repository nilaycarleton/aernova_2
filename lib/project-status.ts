import { ProjectStatus } from "@prisma/client";

/**
 * The ordered project lifecycle a contractor moves a job through. ARCHIVED is
 * a terminal side-state reachable from anywhere, so it is not part of the flow.
 */
export const STATUS_FLOW: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.INSPECTION,
  ProjectStatus.PROCESSING,
  ProjectStatus.READY_FOR_QUOTE,
  ProjectStatus.QUOTED,
  ProjectStatus.SCHEDULED,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.COMPLETED,
];

export const ALL_STATUSES: ProjectStatus[] = [...STATUS_FLOW, ProjectStatus.ARCHIVED];

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
  /** Tailwind classes for the stepper dot when this is the current stage. */
  dot: string;
};

export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  LEAD: {
    label: "Lead",
    description: "New opportunity. Confirm client details, then book an inspection.",
    nextStep: "Start an inspection",
    advanceLabel: "Start inspection",
    badge: "text-slate-300 bg-slate-500/10",
    dot: "bg-slate-400",
  },
  INSPECTION: {
    label: "Inspection",
    description: "Capture drone imagery and photos, and log any roof issues.",
    nextStep: "Add drone photos & log issues",
    advanceLabel: "Send to processing",
    badge: "text-sky-300 bg-sky-500/10",
    dot: "bg-sky-400",
  },
  PROCESSING: {
    label: "Processing",
    description: "Building the 3D model and extracting roof measurements.",
    nextStep: "Building the 3D model…",
    advanceLabel: "Measurements ready",
    badge: "text-amber-300 bg-amber-500/10",
    dot: "bg-amber-400",
  },
  READY_FOR_QUOTE: {
    label: "Ready for quote",
    description: "Measurements are in. Build the proposal for the client.",
    nextStep: "Build the quote",
    advanceLabel: "Mark quoted",
    badge: "text-emerald-300 bg-emerald-500/10",
    dot: "bg-emerald-400",
  },
  QUOTED: {
    label: "Quoted",
    description: "Proposal sent. Follow up and confirm approval.",
    nextStep: "Follow up with the client",
    advanceLabel: "Schedule job",
    badge: "text-blue-300 bg-blue-500/10",
    dot: "bg-blue-400",
  },
  SCHEDULED: {
    label: "Scheduled",
    description: "Job is booked. Assign the crew and prepare materials.",
    nextStep: "Prep the crew & materials",
    advanceLabel: "Start work",
    badge: "text-indigo-300 bg-indigo-500/10",
    dot: "bg-indigo-400",
  },
  IN_PROGRESS: {
    label: "In progress",
    description: "Crew is on site. Track progress to completion.",
    nextStep: "Track the job to completion",
    advanceLabel: "Mark completed",
    badge: "text-violet-300 bg-violet-500/10",
    dot: "bg-violet-400",
  },
  COMPLETED: {
    label: "Completed",
    description: "Job finished. Capture after photos and close out.",
    nextStep: "Add after photos & close out",
    advanceLabel: "Completed",
    badge: "text-teal-300 bg-teal-500/10",
    dot: "bg-teal-400",
  },
  ARCHIVED: {
    label: "Archived",
    description: "Project is archived and hidden from the active pipeline.",
    nextStep: "Archived",
    advanceLabel: "Archived",
    badge: "text-slate-400 bg-slate-600/20",
    dot: "bg-slate-500",
  },
};

export function statusLabel(status: ProjectStatus) {
  return STATUS_META[status]?.label ?? status.replaceAll("_", " ");
}

export function statusBadgeClass(status: ProjectStatus) {
  return STATUS_META[status]?.badge ?? "text-slate-300 bg-slate-500/10";
}

/** The next stage in the flow, or null if at the end / off-flow (ARCHIVED). */
export function nextStatus(status: ProjectStatus): ProjectStatus | null {
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1 || index === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}
