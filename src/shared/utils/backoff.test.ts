import { describe, it, expect, afterEach, vi } from 'vitest';
import { calculateBackoffWithJitter, isOnline, waitForOnline } from './backoff';

describe('calculateBackoffWithJitter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('grows exponentially from the base delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // zero jitter
    expect(calculateBackoffWithJitter(0, 1000, 300000)).toBe(1000);
    expect(calculateBackoffWithJitter(1, 1000, 300000)).toBe(2000);
    expect(calculateBackoffWithJitter(2, 1000, 300000)).toBe(4000);
  });

  it('clamps the exponential term to maxMs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // zero jitter
    expect(calculateBackoffWithJitter(20, 1000, 300000)).toBe(300000);
  });

  it('treats negative attempts as 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(calculateBackoffWithJitter(-5, 1000, 300000)).toBe(1000);
  });

  it('keeps jitter within +/- 20% of the exponential term', () => {
    const base = 1000;
    const max = 300000;
    const attempt = 3; // exp term = 8000
    const exp = 8000;
    for (let i = 0; i < 200; i++) {
      const delay = calculateBackoffWithJitter(attempt, base, max);
      expect(delay).toBeGreaterThanOrEqual(Math.floor(exp * 0.8));
      expect(delay).toBeLessThanOrEqual(Math.ceil(exp * 1.2));
    }
  });

  it('never returns a negative delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // maximum negative jitter
    expect(calculateBackoffWithJitter(0, 1000, 300000)).toBeGreaterThanOrEqual(0);
  });
});

describe('isOnline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reflects navigator.onLine', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(isOnline()).toBe(false);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    expect(isOnline()).toBe(true);
  });
});

describe('waitForOnline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves immediately when online', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    await expect(waitForOnline()).resolves.toBeUndefined();
  });

  it('resolves once an online event fires when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const promise = waitForOnline();
    let resolved = false;
    promise.then(() => {
      resolved = true;
    });
    // Not resolved yet while offline
    await Promise.resolve();
    expect(resolved).toBe(false);

    window.dispatchEvent(new Event('online'));
    await promise;
    expect(resolved).toBe(true);
  });
});
