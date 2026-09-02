import Link from "next/link";

/**
 * A query-param filter, as a pill rather than a `<select>` — every filtered
 * list in the app (`/quotes`, `/schedule`) is a place with a URL, and a link
 * you can bookmark, share, or hit Back on beats a form control that resets
 * the moment you leave.
 */
export function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument ${
        active
          ? "border-transparent bg-surface-lifted font-medium text-ink-primary"
          : "border-hairline text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
      }`}
    >
      {children}
    </Link>
  );
}
