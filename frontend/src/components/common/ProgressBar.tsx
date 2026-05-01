interface ProgressBarProps {
  value: number;
  label?: string;
}

const ProgressBar = ({ value, label }: ProgressBarProps) => (
  <div>
    <div className="flex items-center justify-between text-xs font-semibold uppercase text-stone-400">
      <span>{label ?? 'Progress'}</span>
      <span>{value}%</span>
    </div>
    <div className="mt-2 h-2 rounded-full bg-stone-200">
      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${value}%` }} />
    </div>
  </div>
);

export default ProgressBar;

