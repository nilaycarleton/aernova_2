type Props = {
  totalProjects: number;
  readyForQuote: number;
  quoted: number;
  totalValue: number;
};

export function StatsStrip({
  totalProjects,
  readyForQuote,
  quoted,
  totalValue,
}: Props) {
  const cards = [
    { label: "Total Projects", value: totalProjects.toString() },
    { label: "Ready for Quote", value: readyForQuote.toString() },
    { label: "Quoted", value: quoted.toString() },
    { label: "Proposal Value", value: `$${totalValue.toLocaleString()}` },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-hairline bg-surface-raised p-5"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink-primary">
            {card.value}
          </p>
        </div>
      ))}
    </section>
  );
}