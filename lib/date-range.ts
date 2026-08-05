/**
 * The date windows a contractor thinks in.
 *
 * Three, not Jobber's six. "Last week / last month / this year / last 12 months
 * / custom" is a reporting tool's menu; a roofer wants to know about this
 * season, this month, or ever. A fourth option is a fourth decision before any
 * answer appears.
 *
 * Lives outside the page because reading the clock is not a rendering concern —
 * a component that computes "thirty days ago" while it renders is a component
 * whose output depends on when you looked at it.
 */
export const DATE_RANGES = {
  "30d": { label: "Last 30 days", days: 30 },
  "12m": { label: "Last 12 months", days: 365 },
  all: { label: "All time", days: null },
} as const;

export type RangeKey = keyof typeof DATE_RANGES;

export function isRangeKey(value: string | undefined): value is RangeKey {
  return value === "30d" || value === "12m" || value === "all";
}

/** The start of the window, or null for all time. */
export function rangeStart(range: RangeKey, now: Date = new Date()): Date | null {
  const { days } = DATE_RANGES[range];
  if (days === null) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
