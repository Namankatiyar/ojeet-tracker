import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it('returns null when password is empty', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly for score 0 (too short)', () => {
    const { container } = render(<PasswordStrengthMeter password="short" />);

    const root = container.querySelector('.ob-strength-container');
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-score', '0');

    const segments = container.querySelectorAll('.ob-strength-segment');
    expect(segments).toHaveLength(4);
    segments.forEach((seg) => {
      expect(seg).not.toHaveClass('filled');
    });

    const label = screen.getByText('Too short');
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass('ob-strength-label');
  });

  it('renders correctly for score 1 (weak)', () => {
    const { container } = render(<PasswordStrengthMeter password="abcdefgh" />);

    const root = container.querySelector('.ob-strength-container');
    expect(root).toHaveAttribute('data-score', '1');

    const segments = container.querySelectorAll('.ob-strength-segment');
    expect(segments).toHaveLength(4);
    expect(segments[0]).toHaveClass('filled');
    expect(segments[1]).not.toHaveClass('filled');
    expect(segments[2]).not.toHaveClass('filled');
    expect(segments[3]).not.toHaveClass('filled');

    const label = screen.getByText('Weak');
    expect(label).toBeInTheDocument();
  });

  it('renders correctly for score 2 (fair)', () => {
    const { container } = render(<PasswordStrengthMeter password="abcdefg1" />);

    const root = container.querySelector('.ob-strength-container');
    expect(root).toHaveAttribute('data-score', '2');

    const segments = container.querySelectorAll('.ob-strength-segment');
    expect(segments[0]).toHaveClass('filled');
    expect(segments[1]).toHaveClass('filled');
    expect(segments[2]).not.toHaveClass('filled');
    expect(segments[3]).not.toHaveClass('filled');

    const label = screen.getByText('Fair');
    expect(label).toBeInTheDocument();
  });

  it('renders correctly for score 3 (strong)', () => {
    const { container } = render(<PasswordStrengthMeter password="Abcdefghi1" />);

    const root = container.querySelector('.ob-strength-container');
    expect(root).toHaveAttribute('data-score', '3');

    const segments = container.querySelectorAll('.ob-strength-segment');
    expect(segments[0]).toHaveClass('filled');
    expect(segments[1]).toHaveClass('filled');
    expect(segments[2]).toHaveClass('filled');
    expect(segments[3]).not.toHaveClass('filled');

    const label = screen.getByText('Strong');
    expect(label).toBeInTheDocument();
  });

  it('renders correctly for score 4 (very strong)', () => {
    const { container } = render(<PasswordStrengthMeter password="Password123!" />);

    const root = container.querySelector('.ob-strength-container');
    expect(root).toHaveAttribute('data-score', '4');

    const segments = container.querySelectorAll('.ob-strength-segment');
    segments.forEach((seg) => {
      expect(seg).toHaveClass('filled');
    });

    const label = screen.getByText('Very strong');
    expect(label).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <PasswordStrengthMeter password="test" className="custom-strength-meter" />
    );
    const root = container.querySelector('.ob-strength-container');
    expect(root).toHaveClass('custom-strength-meter');
  });
});
