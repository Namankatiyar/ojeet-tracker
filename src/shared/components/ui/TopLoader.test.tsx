import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TopLoader } from './TopLoader';
import { topLoader } from '../../hooks/useTopLoader';

describe('TopLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render when idle on initial page landing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <TopLoader />
      </MemoryRouter>
    );

    expect(container.querySelector('.top-loader-container')).toBeNull();
  });

  it('renders progress bar with Framer Motion when started', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <TopLoader />
      </MemoryRouter>
    );

    act(() => {
      topLoader.start();
    });

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();

    const bar = container.querySelector('.top-loader-bar');
    expect(bar).toBeInTheDocument();
    expect(container.querySelector('.top-loader-glow')).toBeInTheDocument();
  });

  it('progresses smoothly when trickling', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TopLoader />
      </MemoryRouter>
    );

    act(() => {
      topLoader.start();
    });

    const initialProgress = topLoader.getState().progress;
    expect(initialProgress).toBeGreaterThanOrEqual(25);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(topLoader.getState().progress).toBeGreaterThan(initialProgress);
  });

  it('completes, fades out, and resets to 0', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TopLoader />
      </MemoryRouter>
    );

    act(() => {
      topLoader.start();
    });

    act(() => {
      topLoader.complete();
    });

    expect(topLoader.getState().progress).toBe(100);

    // After 250ms, visible should become false
    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(topLoader.getState().visible).toBe(false);

    // After fade out transition (350ms), progress resets to 0
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(topLoader.getState().progress).toBe(0);
  });
});
