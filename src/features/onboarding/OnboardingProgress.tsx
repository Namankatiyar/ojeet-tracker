interface OnboardingProgressProps {
  current: number;
  total: number;
}

export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  return (
    <div
      className="ob-progress"
      role="progressbar"
      aria-label={`Step ${current} of ${total}`}
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`ob-progress-segment ${i < current ? 'completed' : ''} ${i === current - 1 ? 'active' : ''}`}
        />
      ))}
    </div>
  );
}
