/**
 * Retry/backoff helpers shared across sync and polling hooks.
 *
 * Centralizes jittered exponential backoff and a network-recovery await so the
 * remote sync engine and community hooks avoid thundering-herd retries and
 * redundant requests while offline.
 */

/**
 * Exponential backoff with +/- 20% jitter, clamped to `maxMs`.
 *
 * @param attempt  Zero-based retry attempt (0 = first backoff after a failure).
 * @param baseMs   Base delay for the first backoff.
 * @param maxMs    Upper bound for the returned delay (after jitter).
 * @returns Delay in ms, never negative and never exceeding `maxMs`.
 */
export function calculateBackoffWithJitter(attempt: number, baseMs: number, maxMs: number): number {
  const safeAttempt = Math.max(0, Number.isFinite(attempt) ? attempt : 0);
  const exp = Math.min(maxMs, baseMs * 2 ** safeAttempt);
  // +/- 20% jitter
  const jitter = (Math.random() * 0.4 - 0.2) * exp;
  return Math.max(0, Math.min(maxMs, Math.floor(exp + jitter)));
}

/** True when the browser reports an online connection (or cannot tell). */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true;
  }
  return navigator.onLine;
}

/**
 * Resolves immediately when online, otherwise resolves on the next `online`
 * event via a one-shot listener. Safe to call in non-browser environments.
 */
export function waitForOnline(): Promise<void> {
  if (isOnline() || typeof window === 'undefined') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const onOnline = () => {
      window.removeEventListener('online', onOnline);
      resolve();
    };
    window.addEventListener('online', onOnline);
  });
}
