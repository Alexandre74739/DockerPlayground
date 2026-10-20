type ProgressBarProps = {
  value: number;
  max: number;
  className?: string;
};

export function ProgressBar({ value, max, className = "" }: ProgressBarProps) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-brand-100 ${className}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}
