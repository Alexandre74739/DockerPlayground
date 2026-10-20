type ProgressBarProps = {
  value: number;
  max: number;
  className?: string;
  tone?: "azure" | "neon";
};

export function ProgressBar({ value, max, className = "", tone = "azure" }: ProgressBarProps) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-ink-700 ${className}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${tone === "neon" ? "bg-neon-400" : "bg-azure-500"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
