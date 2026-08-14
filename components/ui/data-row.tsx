import { Item } from "@astryxdesign/core/Item";
import type { MouseEvent, ReactNode } from "react";

/**
 * The one operational row — job/request/quote/invoice summary lines. The
 * Phase 3 duplication audit found three incompatible hand-rolled row
 * mechanisms (card-div, `<li>`-card, native `<table>`) for exactly this
 * shape across 6 files; this wraps Astryx Item (Decision A) instead of a
 * fourth, since Item already solves the parts that are easy to get wrong:
 * `interactiveRef` avoids a second tab stop when a row wraps a nested
 * control, and `href`/`onClick` pick correct link/button semantics instead
 * of a clickable `<div>`.
 *
 * Deliberately opinionated (Step 40): four named slots, not a generic
 * children prop — a DataRow that can render anything stops being a DataRow.
 */
export function DataRow({
  leading,
  primary,
  meta,
  trailing,
  href,
  onClick,
  selected,
  disabled,
}: {
  /** Status dot, small icon, or avatar — kept small, never a second heading. */
  leading?: ReactNode;
  primary: ReactNode;
  /**
   * Secondary line — address, client name, timestamp. Doctrine for missing
   * data (Impeccable critique finding, Phase 3): supply an explicit
   * placeholder string (e.g. "No address on file") rather than omitting the
   * line — a row that silently loses its second line on missing data reads
   * as a layout glitch next to rows that have one; an explicit placeholder
   * reads as "checked, nothing here."
   */
  meta?: ReactNode;
  /** Value/status on the trailing edge — a Status, a NumericReadout, or plain text. */
  trailing?: ReactNode;
  href?: string;
  /** Requires a client-component caller — a Server Component can't hand this a closure. */
  onClick?: (event: MouseEvent) => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Item
      as="li"
      startContent={leading}
      label={primary}
      description={meta}
      endContent={trailing}
      href={href}
      onClick={onClick}
      isSelected={selected}
      isDisabled={disabled}
    />
  );
}
