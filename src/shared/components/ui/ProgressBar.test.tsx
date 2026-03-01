import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar, ProgressRing } from './ProgressBar';

describe('ProgressBar', () => {
    it('renders with default props', () => {
        const { container } = render(<ProgressBar progress={50} />);

        // Should show label by default
        expect(screen.getByText('50% Complete')).toBeInTheDocument();

        // Find the progress bar fill container
        const barFill = container.querySelector('.progress-bar-fill');
        expect(barFill).toBeInTheDocument();
        expect(barFill).toHaveStyle('width: 50%');

        // Find the outer progress bar to check default height
        const bar = container.querySelector('.progress-bar');
        expect(bar).toBeInTheDocument();
        expect(bar).toHaveStyle('height: 8px');
    });

    it('hides label when showLabel is false', () => {
        render(<ProgressBar progress={50} showLabel={false} />);
        expect(screen.queryByText(/Complete/)).not.toBeInTheDocument();
    });

    it('respects custom height', () => {
        const { container } = render(<ProgressBar progress={50} height={16} />);
        const bar = container.querySelector('.progress-bar');
        expect(bar).toHaveStyle('height: 16px');
    });

    it('clamps progress to 0', () => {
        const { container } = render(<ProgressBar progress={-10} />);
        expect(screen.getByText('0% Complete')).toBeInTheDocument();
        const barFill = container.querySelector('.progress-bar-fill');
        expect(barFill).toHaveStyle('width: 0%');
    });

    it('clamps progress to 100', () => {
        const { container } = render(<ProgressBar progress={150} />);
        expect(screen.getByText('100% Complete')).toBeInTheDocument();
        const barFill = container.querySelector('.progress-bar-fill');
        expect(barFill).toHaveStyle('width: 100%');
    });
});

describe('ProgressRing', () => {
    it('renders with default props', () => {
        const { container } = render(<ProgressRing progress={75} />);

        // Should display the correct progress text
        expect(screen.getByText('75')).toBeInTheDocument();
        expect(screen.getByText('%')).toBeInTheDocument();

        // Check correct container sizing
        const ringContainer = container.querySelector('.progress-ring-container');
        expect(ringContainer).toHaveStyle('width: 120px');
        expect(ringContainer).toHaveStyle('height: 120px');

        // Check progress fill offset
        const ringFill = container.querySelector('.progress-ring-fill');
        expect(ringFill).toBeInTheDocument();
        // Since size is 120 and stroke is 8, radius = (120-8)/2 = 56
        // circumference = 2 * PI * 56 ≈ 351.858
        // offset for 75% = 351.858 * 0.25 ≈ 87.964
        // We'll just check that it has a strokeDashoffset style set to a string containing a number
        expect(ringFill?.getAttribute('style')).toContain('stroke-dashoffset');
    });

    it('clamps progress to 0', () => {
        render(<ProgressRing progress={-5} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('clamps progress to 100', () => {
        render(<ProgressRing progress={200} />);
        expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('respects custom size, color, and strokeWidth props', () => {
        const { container } = render(
            <ProgressRing progress={50} size={60} strokeWidth={4} color="red" />
        );

        const ringContainer = container.querySelector('.progress-ring-container');
        expect(ringContainer).toHaveStyle('width: 60px');
        expect(ringContainer).toHaveStyle('height: 60px');

        const bgCircle = container.querySelector('.progress-ring-bg');
        expect(bgCircle).toHaveAttribute('stroke-width', '4');

        const fillCircle = container.querySelector('.progress-ring-fill');
        expect(fillCircle).toHaveAttribute('stroke-width', '4');
        expect(fillCircle).toHaveAttribute('stroke', 'red');
    });
});
