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
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

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
                <span className="progress-value">{progress}</span>
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
    return (
        <div className="progress-bar-container">
            {showLabel && <span className="progress-bar-label">{progress}% Complete</span>}
            <div className="progress-bar" style={{ height }}>
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${progress}%`,
                        transition: 'width 0.5s ease'
                    }}
                />
            </div>
        </div>
    );
}
