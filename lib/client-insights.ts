/**
 * The three figures above the client list.
 *
 * New leads and new clients over the last 30 days, each against the 30 before
 * it, plus the year's running total of clients won. Kept here, pure, because
 * the interesting part is not the arithmetic — it is what the product refuses
 * to claim when there is nothing to compare against.
 */

export type ClientDates = {
  createdAt: Date;
  /** Null while they are still a lead. */
  convertedAt: Date | null;
};

export type Tile = {
  label: string;
  value: number;
  /**
   * Percent change against the previous period, or null when there is no
   * honest number to give.
   *
   * A jump from zero is not "+100%" and it is not "+∞" — it is the first one,
   * and the tile says so in words instead. This is the whole reason `delta` is
   * nullable rather than defaulting to 0: a computed 0% reads as "no change",
   * which is the opposite of what "nothing before, something now" means.
   */
  delta: number | null;
  /** What the delta is measured against, for the caption under the figure. */
  comparison: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

function countBetween(dates: (Date | null)[], from: Date, to: Date): number {
  return dates.filter((d) => d !== null && d >= from && d < to).length;
}

/** Rounded percent change, or null where the baseline is zero. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function clientTiles(clients: ClientDates[], now: Date = new Date()): Tile[] {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * DAY);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const created = clients.map((c) => c.createdAt);
  const converted = clients.map((c) => c.convertedAt);

  const leadsNow = countBetween(created, thirtyDaysAgo, now);
  const leadsBefore = countBetween(created, sixtyDaysAgo, thirtyDaysAgo);
  const clientsNow = countBetween(converted, thirtyDaysAgo, now);
  const clientsBefore = countBetween(converted, sixtyDaysAgo, thirtyDaysAgo);

  return [
    {
      label: "New leads",
      value: leadsNow,
      delta: percentChange(leadsNow, leadsBefore),
      comparison: "vs. the 30 days before",
    },
    {
      label: "New clients",
      value: clientsNow,
      delta: percentChange(clientsNow, clientsBefore),
      comparison: "vs. the 30 days before",
    },
    {
      // No delta: last year is not a fair comparison for a year that is three
      // weeks old, and there is no honest 30-day baseline for a YTD figure.
      label: "Clients won this year",
      value: countBetween(converted, yearStart, now),
      delta: null,
      comparison: null,
    },
  ];
}
