import { useId } from 'react';

interface RingProgressProps {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
  sublabel?: string;
}

/** Circular progress ring (0–100). */
const RingProgress = ({
  value,
  size = 120,
  stroke = 10,
  className = '',
  label,
  sublabel,
}: RingProgressProps) => {
  const gradId = useId().replace(/:/g, '');
  const pct = Math.min(100, Math.max(0, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={`ringGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ringGrad-${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="smooth-transition"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label != null && <span className="font-display text-2xl font-bold text-stone-900">{label}</span>}
        {sublabel != null && <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{sublabel}</span>}
      </div>
    </div>
  );
};

export default RingProgress;
