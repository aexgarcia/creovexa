export function CompletionRing({ value, label }: { value: number; label: string }) {
  const percentage = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative size-14 shrink-0 rounded-full"
      style={{ background: `conic-gradient(var(--primary) ${percentage}%, var(--border) 0)` }}
    >
      <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-card">
        <span className="font-mono text-xs leading-none font-medium tabular-nums">
          {percentage}%
        </span>
      </div>
    </div>
  );
}
