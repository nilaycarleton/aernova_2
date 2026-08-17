/**
 * Aernova-shaped fixture data for the Phase 0 prototype and concept seeds.
 *
 * Deliberately not a live Prisma query. This is prototype-only, unlinked
 * exploration code (see layout.tsx's gate) — wiring it to real company data
 * would mean touching `requireJobAccess`/`can()`/server actions for a surface
 * that gets deleted at the end of Phase 0. The field shapes, status labels,
 * and value ranges below are modeled on the real schema (`prisma/schema.prisma`),
 * `lib/job-status.ts`'s STATUS_META, and `lib/pipeline.ts` — not invented.
 */

export type ProtoRole = "OWNER" | "ESTIMATOR" | "SALES" | "CREW";

export const ROLES: { id: ProtoRole; label: string; blurb: string }[] = [
  { id: "OWNER", label: "Owner / Admin", blurb: "Runs the business, wants today's exceptions" },
  { id: "ESTIMATOR", label: "Office / Estimator", blurb: "Schedules, quotes, documents — desktop detail" },
  { id: "SALES", label: "Sales", blurb: "Requests, pipeline, quote follow-up" },
  { id: "CREW", label: "Crew", blurb: "One task, one hand, outdoors" },
];

export type JobStatusId =
  | "LEAD"
  | "INSPECTION"
  | "PROCESSING"
  | "READY_FOR_QUOTE"
  | "QUOTED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED";

export const STATUS_LABEL: Record<JobStatusId, string> = {
  LEAD: "Lead",
  INSPECTION: "Inspection",
  PROCESSING: "Processing",
  READY_FOR_QUOTE: "Ready for quote",
  QUOTED: "Quoted",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

/** Tonal tier, matching lib/job-status.ts's in-flight / complete / archived doctrine. */
export const STATUS_TIER: Record<JobStatusId, "flight" | "complete"> = {
  LEAD: "flight",
  INSPECTION: "flight",
  PROCESSING: "flight",
  READY_FOR_QUOTE: "flight",
  QUOTED: "flight",
  SCHEDULED: "flight",
  IN_PROGRESS: "flight",
  COMPLETED: "complete",
};

export type ProtoJob = {
  id: string;
  client: string;
  address: string;
  trade: "Roofing" | "Plumbing" | "Lawn Care" | "General Contracting";
  status: JobStatusId;
  nextAction: string;
  valueCents: number;
  owner: string;
  updatedAt: string;
  flagged?: "warning" | "danger";
};

export const JOBS: ProtoJob[] = [
  {
    id: "job_9f2",
    client: "Whitfield Residence",
    address: "142 Aspen Ridge Court, Barrhaven, ON",
    trade: "Roofing",
    status: "QUOTED",
    nextAction: "Follow up — quote opened, no response in 4 days",
    valueCents: 1284000,
    owner: "Marisol Ortega",
    updatedAt: "2h ago",
    flagged: "warning",
  },
  {
    id: "job_1a7",
    client: "Dunmore Property Group — Unit 4B",
    address: "88 Merivale Road, Nepean, ON",
    trade: "General Contracting",
    status: "IN_PROGRESS",
    nextAction: "3 of 5 visits completed",
    valueCents: 4650000,
    owner: "Dwayne Fitch",
    updatedAt: "Yesterday",
  },
  {
    id: "job_c31",
    client: "The Okonkwo-Reyes Family",
    address: "6 Blackthorn Lane, Kanata, ON",
    trade: "Roofing",
    status: "PROCESSING",
    nextAction: "Building the 3D model…",
    valueCents: 0,
    owner: "Marisol Ortega",
    updatedAt: "38 minutes ago",
  },
  {
    id: "job_88d",
    client: "Fenwick & Sons Hardware",
    address: "1200 Industrial Parkway, Ottawa, ON",
    trade: "Lawn Care",
    status: "SCHEDULED",
    nextAction: "Crew assigned — starts Thursday",
    valueCents: 218000,
    owner: "Priya Nathwani",
    updatedAt: "3 days ago",
  },
  {
    id: "job_50e",
    client: "Vellani Holdings — 3 Riverbend",
    address: "3 Riverbend Terrace, Stittsville, ON",
    trade: "Plumbing",
    status: "LEAD",
    nextAction: "Confirm client details, book an inspection",
    valueCents: 0,
    owner: "Unassigned",
    updatedAt: "1 hour ago",
    flagged: "danger",
  },
  {
    id: "job_e02",
    client: "Bramblewood Long-Term Care",
    address: "77 Cattail Crescent, Orleans, ON",
    trade: "Roofing",
    status: "READY_FOR_QUOTE",
    nextAction: "Measurements are in — build the quote",
    valueCents: 0,
    owner: "Dwayne Fitch",
    updatedAt: "5 hours ago",
    flagged: "warning",
  },
  {
    id: "job_7bf",
    client: "Castellano Residence",
    address: "24 Sugarbush Way, Manotick, ON",
    trade: "Roofing",
    status: "COMPLETED",
    nextAction: "Quality check passed — invoice sent",
    valueCents: 976500,
    owner: "Marisol Ortega",
    updatedAt: "1 week ago",
  },
];

export const DASHBOARD_ACTIONS = [
  {
    id: "act_1",
    title: "Quote hasn't been opened in 6 days",
    detail: "Vellani Holdings · $12,840",
    href: "job_50e",
    severity: "warning" as const,
  },
  {
    id: "act_2",
    title: "Invoice is 9 days overdue",
    detail: "Fenwick & Sons Hardware · $2,180 due",
    href: "job_88d",
    severity: "danger" as const,
  },
  {
    id: "act_3",
    title: "New request needs a first response",
    detail: "Okonkwo-Reyes Family — submitted 40 minutes ago",
    href: "job_c31",
    severity: "info" as const,
  },
];

export const TODAY_SCHEDULE = [
  { time: "8:00 AM", label: "Inspection — Riverbend Terrace", crew: "M. Ortega" },
  { time: "10:30 AM", label: "Install — Merivale Road, day 3 of 5", crew: "D. Fitch + 2" },
  { time: "1:00 PM", label: "Lawn maintenance — Industrial Parkway", crew: "P. Nathwani" },
  { time: "3:30 PM", label: "Quality walkthrough — Sugarbush Way", crew: "M. Ortega" },
];

export function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
