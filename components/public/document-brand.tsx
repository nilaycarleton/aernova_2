/**
 * Company identity, top-left of every customer-facing paper document — quote
 * and invoice today, warranty/change-order/additional-work pages as they
 * ship. One placement rule so a homeowner recognizes a contractor's next
 * document by where its identity sits, not just what it says. See
 * docs/DESIGN.md's "Company branding on every paper surface" and
 * docs/AERNOVA_PROJECT_WORKFLOW.md §14.7.
 */
export function DocumentBrand({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (!logoUrl) {
    return <p className="text-lg font-semibold text-paper-ink">{name}</p>;
  }

  return (
    // No min-width, no forced box fill, no background fill — a non-square
    // logo leaves the document's own paper colour showing through the space
    // it doesn't use, rather than sitting inside a visible tile. Capped, not
    // fixed: a naturally small or narrow logo renders at its own size.
    <img
      src={logoUrl}
      alt={name}
      className="block h-auto max-h-12 w-auto max-w-[200px] object-contain"
    />
  );
}
