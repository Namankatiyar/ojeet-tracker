import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockRegisterSW = vi.fn();

vi.mock('./pwaRegister', () => ({
  registerSW: (options: unknown) => mockRegisterSW(options),
}));

describe('pwaBridge aggressive update rollout', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    mockRegisterSW.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('triggers immediate update and schedules periodic/visibility/online update checks', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockUpdateSW = vi.fn().mockResolvedValue(undefined);
    let capturedOptions: any = null;

    mockRegisterSW.mockImplementation((options: any) => {
      capturedOptions = options;
      return mockUpdateSW;
    });

    const { initPwaBridge, getPwaBridgeState } = await import('./pwaBridge');
    initPwaBridge();

    expect(mockRegisterSW).toHaveBeenCalledTimes(1);
    expect(capturedOptions.immediate).toBe(true);

    // Simulate registered SW with a waiting worker
    capturedOptions.onRegisteredSW('/sw.js', {
      waiting: {} as ServiceWorker,
      update: mockUpdate,
    });

    expect(getPwaBridgeState().needRefresh).toBe(true);
    expect(mockUpdateSW).toHaveBeenCalledWith(true);

    // Periodic check after 15 minutes
    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // Online event after >60s gap triggers update check
    vi.advanceTimersByTime(61 * 1000);
    window.dispatchEvent(new Event('online'));
    expect(mockUpdate).toHaveBeenCalledTimes(2);

    // Visibility change within <60s gap is throttled
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockUpdate).toHaveBeenCalledTimes(2);

    // Visibility change after >60s gap triggers update check
    vi.advanceTimersByTime(61 * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockUpdate).toHaveBeenCalledTimes(3);
  });

  it('auto-reloads when a new service worker takes control over an existing controller', async () => {
    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });

    const listeners: Record<string, EventListener[]> = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: {} as ServiceWorker,
        addEventListener: (event: string, cb: EventListener) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(cb);
        },
        getRegistrations: vi.fn().mockResolvedValue([]),
      },
    });

    mockRegisterSW.mockImplementation(() => vi.fn().mockResolvedValue(undefined));

    const { initPwaBridge } = await import('./pwaBridge');
    initPwaBridge();

    expect(listeners['controllerchange']).toHaveLength(1);
    listeners['controllerchange'][0](new Event('controllerchange'));
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    // Second controllerchange does not double-reload
    listeners['controllerchange'][0](new Event('controllerchange'));
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
