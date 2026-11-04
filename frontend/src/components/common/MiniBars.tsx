type Props = { label: string; values: number[]; dates: string[] };

/** Dependency-free bar chart (keeps the bundle small for low-bandwidth users). */
const MiniBars = ({ label, values, dates }: Props) => {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <figure className="space-y-2">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-stone-800">{label}</span>
        <span className="text-xs text-stone-500">{total} total</span>
      </figcaption>
      <div className="flex h-20 items-end gap-px rounded-lg bg-stone-50 p-1" role="img" aria-label={`${label}: ${total} in this period`}>
        {values.map((v, i) => (
          <div
            key={dates[i]}
            title={`${dates[i]}: ${v}`}
            className="flex-1 rounded-t bg-primary/70"
            style={{ height: `${Math.max(v > 0 ? 6 : 0, (v / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-stone-400">
        <span>{dates[0]}</span>
        <span>{dates[dates.length - 1]}</span>
      </div>
    </figure>
  );
};

export default MiniBars;
