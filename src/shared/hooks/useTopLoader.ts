import { useState, useEffect, useCallback } from 'react';

export interface TopLoaderState {
  progress: number;
  visible: boolean;
  isAnimating: boolean;
}

type TopLoaderListener = (state: TopLoaderState) => void;

class TopLoaderManager {
  private progress = 0;
  private visible = false;
  private isAnimating = false;
  private listeners = new Set<TopLoaderListener>();
  private trickleTimer: ReturnType<typeof setInterval> | null = null;
  private completeTimer: ReturnType<typeof setTimeout> | null = null;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe = (listener: TopLoaderListener): (() => void) => {
    this.listeners.add(listener);
    listener({
      progress: this.progress,
      visible: this.visible,
      isAnimating: this.isAnimating,
    });
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    const currentState: TopLoaderState = {
      progress: this.progress,
      visible: this.visible,
      isAnimating: this.isAnimating,
    };
    this.listeners.forEach((listener) => listener(currentState));
  }

  getState(): TopLoaderState {
    return {
      progress: this.progress,
      visible: this.visible,
      isAnimating: this.isAnimating,
    };
  }

  start = () => {
    this.clearTimers();
    this.visible = true;
    this.isAnimating = true;

    if (this.progress < 25 || this.progress === 100) {
      this.progress = 25;
    }
    this.notify();

    this.trickleTimer = setInterval(() => {
      if (this.progress < 88) {
        // Smooth asymptotic trickle step
        const remaining = 88 - this.progress;
        const step = Math.max(1.2, remaining * 0.12);
        this.progress = Math.min(88, this.progress + step);
        this.notify();
      }
    }, 150);
  };

  set = (value: number) => {
    this.clearTimers();
    this.progress = Math.min(100, Math.max(0, value));
    this.visible = true;
    this.isAnimating = true;
    this.notify();
  };

  complete = () => {
    this.clearTimers();
    if (!this.visible && this.progress === 0) return;

    this.progress = 100;
    this.notify();

    // Allow Framer Motion to animate scaleX to 100% smoothly
    this.completeTimer = setTimeout(() => {
      this.visible = false;
      this.notify();

      // Reset after Framer Motion exit animation completes
      this.resetTimer = setTimeout(() => {
        this.progress = 0;
        this.isAnimating = false;
        this.notify();
      }, 350);
    }, 250);
  };

  private clearTimers() {
    if (this.trickleTimer) clearInterval(this.trickleTimer);
    if (this.completeTimer) clearTimeout(this.completeTimer);
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.trickleTimer = null;
    this.completeTimer = null;
    this.resetTimer = null;
  }
}

export const topLoader = new TopLoaderManager();

export function useTopLoader() {
  const [state, setState] = useState<TopLoaderState>(() => topLoader.getState());

  useEffect(() => {
    return topLoader.subscribe(setState);
  }, []);

  const start = useCallback(() => topLoader.start(), []);
  const complete = useCallback(() => topLoader.complete(), []);
  const set = useCallback((value: number) => topLoader.set(value), []);

  return {
    ...state,
    start,
    complete,
    set,
  };
}
