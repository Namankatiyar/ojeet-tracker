interface ProgressRingProps {
    progress: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}

export function ProgressRing({
    progress,
    size = 120,
    strokeWidth = 8,
    color = 'var(--accent)'
}: ProgressRingProps) {
    // Ensure progress is between 0 and 100
    const clampedProgress = Math.min(Math.max(progress, 0), 100);

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (clampedProgress / 100) * circumference;

    return (
        <div className="progress-ring-container" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="progress-ring">
                <circle
                    className="progress-ring-bg"
                    stroke="var(--border)"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="progress-ring-fill"
                    stroke={color}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{
                        transform: 'rotate(-90deg)',
                        transformOrigin: '50% 50%',
                        transition: 'stroke-dashoffset 0.5s ease'
                    }}
                />
            </svg>
            <div className="progress-ring-text">
                <span className="progress-value">{clampedProgress}</span>
                <span className="progress-symbol">%</span>
            </div>
        </div>
    );
}

interface ProgressBarProps {
    progress: number;
    height?: number;
    showLabel?: boolean;
}

export function ProgressBar({ progress, height = 8, showLabel = true }: ProgressBarProps) {
    // Ensure progress is between 0 and 100
    const clampedProgress = Math.min(Math.max(progress, 0), 100);

    return (
        <div className="progress-bar-container">
            {showLabel && <span className="progress-bar-label">{clampedProgress}% Complete</span>}
            <div className="progress-bar" style={{ height }}>
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${clampedProgress}%`,
                        transition: 'width 0.5s ease'
                    }}
                />
            </div>
        </div>
    );
}
