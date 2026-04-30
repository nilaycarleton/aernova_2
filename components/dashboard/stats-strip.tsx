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
          className="rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {card.value}
          </p>
        </div>
      ))}
    </section>
  );
}