import clsx from 'clsx';

interface ProgressBarProps {
  value: number;
  label?: string;
  /** Show percentage on the right */
  showPercent?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const ProgressBar = ({
  value,
  label,
  showPercent = true,
  size = 'md',
  className,
}: ProgressBarProps) => {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const barH = size === 'sm' ? 'h-2' : 'h-2.5';

  return (
    <div className={clsx('w-full', className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
        <span>{label ?? 'Progress'}</span>
        {showPercent && <span className="tabular-nums text-stone-600">{pct}%</span>}
      </div>
      <div
        className={clsx('mt-2 overflow-hidden rounded-full bg-stone-200/90 shadow-inner', barH)}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={clsx(
            'h-full rounded-full bg-gradient-to-r from-primary via-primary-light to-accent shadow-sm smooth-transition',
            'motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
