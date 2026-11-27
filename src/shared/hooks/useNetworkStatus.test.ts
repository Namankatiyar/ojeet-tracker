import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks online and offline window events', () => {
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      onLineSpy.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      onLineSpy.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('re-syncs navigator.onLine on window focus', () => {
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);

    // Network came back while tab was unfocused (no online event received)
    onLineSpy.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('re-syncs navigator.onLine when visibilitychange transitions to visible', () => {
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    // While hidden, network drops; hidden visibilitychange should not sync yet
    onLineSpy.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.isOnline).toBe(true);

    // Returning to visible re-syncs stale online state
    visibilitySpy.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.isOnline).toBe(false);
  });
});
