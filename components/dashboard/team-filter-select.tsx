"use client";

import { useRouter } from "next/navigation";

/**
 * The one filter that's a `<select>` instead of a pill row — a two- or
 * three-person shop reads fine as pills, but "Team" scales with headcount in
 * a way Type and Status never do, and a dropdown is where a list that can
 * grow belongs.
 */
export function TeamFilterSelect({
  href,
  current,
  team,
}: {
  /** The current URL with `team=` already stripped, ready to have a value appended. */
  href: string;
  current: string;
  team: { userId: string; name: string }[];
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={current}
      onChange={(event) => {
        const value = event.target.value;
        const separator = href.includes("?") ? "&" : "?";
        router.push(value ? `${href}${separator}team=${value}` : href);
      }}
      aria-label="Filter by who's on it"
      className="rounded-full border border-hairline bg-ground/50 px-3 py-1.5 text-sm text-ink-secondary outline-none transition focus:border-signal-blue"
    >
      <option value="">Everyone</option>
      {team.map((member) => (
        <option key={member.userId} value={member.userId}>
          {member.name}
        </option>
      ))}
    </select>
  );
}
