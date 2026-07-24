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
  // Pipeline counts are context; the open proposal value is the number a
  // contractor actually tracks — so it gets the weight, not a fourth identical
  // tile that flattens it against "3 projects".
  const counts = [
    { label: "Total Projects", value: totalProjects.toString() },
    { label: "Ready for Quote", value: readyForQuote.toString() },
    { label: "Quoted", value: quoted.toString() },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {counts.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-hairline bg-surface-raised p-5"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-primary">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-instrument/25 bg-instrument/5 p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-instrument-fg">
          Proposal Value
        </p>
        <p className="mt-2 text-4xl font-semibold tabular-nums text-instrument-fg">
          ${totalValue.toLocaleString()}
        </p>
      </div>
    </section>
  );
}
