import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { useLocalStorage } from '../../shared/hooks/useLocalStorage';

export type Theme = 'light' | 'dark-glass' | 'dark-solid';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme | ((prev: Theme) => Theme)) => void;
  accentColor: string;
  setAccentColor: (color: string | ((prev: string) => string)) => void;
  backgroundUrl: string;
  setBackgroundUrl: (url: string | ((prev: string) => string)) => void;
  dimLevel: number;
  setDimLevel: (level: number | ((prev: number) => number)) => void;
  glassIntensity: number;
  setGlassIntensity: (intensity: number | ((prev: number) => number)) => void;
  glassRefraction: number;
  setGlassRefraction: (refraction: number | ((prev: number) => number)) => void;
  useGridBackground: boolean;
  setUseGridBackground: (use: boolean | ((prev: boolean) => boolean)) => void;
  toggleTheme: () => void;
  setSupportOverride: (active: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read theme from localStorage with migration from 'dark' to 'dark-glass'
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    try {
      const stored = window.localStorage.getItem('jee-tracker-theme');
      if (stored) {
        let parsed = JSON.parse(stored);
        if (parsed === 'dark') {
          parsed = 'dark-glass';
          window.localStorage.setItem('jee-tracker-theme', JSON.stringify('dark-glass'));
        }
        return parsed as Theme;
      }
    } catch (e) {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-glass' : 'light';
  };

  const [theme, setTheme] = useLocalStorage<Theme>('jee-tracker-theme', getInitialTheme());
  const [accentColor, setAccentColor] = useLocalStorage<string>('jee-tracker-accent', '#06b6d4');
  const [backgroundUrl, setBackgroundUrl] = useLocalStorage<string>(
    'jee-tracker-background-url',
    'https://images.unsplash.com/photo-1475070929565-c985b496cb9f?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  );
  const [dimLevel, setDimLevel] = useLocalStorage<number>('jee-tracker-dim-level', 30);
  const [glassIntensity, setGlassIntensity] = useLocalStorage<number>(
    'jee-tracker-glass-intensity',
    50
  );
  const [glassRefraction, setGlassRefraction] = useLocalStorage<number>(
    'jee-tracker-glass-refraction',
    50
  );
  const [useGridBackground, setUseGridBackground] = useLocalStorage<boolean>(
    'jee-tracker-grid-bg',
    true
  );

  const [supportOverride, setSupportOverride] = useState(false);

  const effectiveAccentColor = supportOverride ? '#ff4d6d' : accentColor;
  const effectiveBackgroundUrl = supportOverride
    ? 'https://images.unsplash.com/photo-1755958681554-e0689f85eda0?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    : backgroundUrl;

  const toggleTheme = () =>
    setTheme((prev) => {
      if (prev === 'light') return 'dark-solid';
      if (prev === 'dark-solid') return 'dark-glass';
      return 'light';
    });

  // Apply theme
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Apply accent color and derive secondary accent
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', effectiveAccentColor);
    document.documentElement.style.setProperty(
      '--accent-light',
      `color-mix(in srgb, ${effectiveAccentColor}, transparent 90%)`
    );
    document.documentElement.style.setProperty(
      '--accent-hover',
      `color-mix(in srgb, ${effectiveAccentColor}, black 10%)`
    );

    // Calculate contrast text color
    const hex = effectiveAccentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 128 ? '#000000' : '#ffffff';
    const borderColor = brightness > 200 ? 'var(--border)' : effectiveAccentColor;
    document.documentElement.style.setProperty('--accent-text', textColor);
    document.documentElement.style.setProperty('--accent-border', borderColor);

    // Derive secondary accent color (shift hue by ~60 degrees for complementary feel)
    const rNorm = r / 255,
      gNorm = g / 255,
      bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm),
      min = Math.min(rNorm, gNorm, bNorm);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rNorm:
          h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
          break;
        case gNorm:
          h = ((bNorm - rNorm) / d + 2) / 6;
          break;
        case bNorm:
          h = ((rNorm - gNorm) / d + 4) / 6;
          break;
      }
    }
    const newH = (h + 1 / 6) % 1;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r2 = Math.round(hue2rgb(p, q, newH + 1 / 3) * 255);
    const g2 = Math.round(hue2rgb(p, q, newH) * 255);
    const b2 = Math.round(hue2rgb(p, q, newH - 1 / 3) * 255);
    const secondaryAccent = `#${r2.toString(16).padStart(2, '0')}${g2.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;
    document.documentElement.style.setProperty('--secondary-accent', secondaryAccent);

    // Update PWA theme color
    const metaThemeColor = document.querySelector('meta[name=theme-color]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', effectiveAccentColor);
    }
  }, [effectiveAccentColor]);

  // Apply custom background, dimming, and glassmorphism intensity
  useEffect(() => {
    // Clear direct background inline style from previous implementation
    document.body.style.backgroundImage = '';

    if (theme === 'dark-solid' && useGridBackground) {
      document.documentElement.style.setProperty('--custom-bg-url', 'none');
      document.body.classList.remove('has-custom-bg');
      document.body.classList.add('has-grid-bg');
    } else if (effectiveBackgroundUrl && (theme === 'dark-glass' || theme === 'dark-solid')) {
      document.documentElement.style.setProperty(
        '--custom-bg-url',
        `url("${effectiveBackgroundUrl}")`
      );
      document.body.classList.add('has-custom-bg');
      document.body.classList.remove('has-grid-bg');
    } else {
      document.documentElement.style.setProperty('--custom-bg-url', 'none');
      document.body.classList.remove('has-custom-bg');
      document.body.classList.remove('has-grid-bg');
    }
    document.documentElement.style.setProperty('--dim-level', (dimLevel / 100).toString());

    const intensity = glassIntensity / 100;
    const blurValue = intensity * 20;
    const bgOpacity = 0.2 + intensity * 0.4;
    const borderOpacity = 0.05 + intensity * 0.1;

    const refraction = glassRefraction / 100;
    const saturation = 100 + refraction * 200;
    const brightness = 100 + refraction * 30;
    const hueRotate = refraction * 15;

    document.documentElement.style.setProperty('--glass-blur', `${blurValue}px`);
    document.documentElement.style.setProperty('--glass-bg', `rgba(18, 18, 26, ${bgOpacity})`);
    document.documentElement.style.setProperty(
      '--glass-bg-hover',
      `rgba(26, 26, 40, ${bgOpacity + 0.1})`
    );
    document.documentElement.style.setProperty(
      '--glass-border',
      `rgba(255, 255, 255, ${borderOpacity})`
    );
    document.documentElement.style.setProperty(
      '--glass-border-light',
      `rgba(255, 255, 255, ${borderOpacity + 0.05})`
    );
    document.documentElement.style.setProperty(
      '--glass-refraction',
      `saturate(${saturation}%) brightness(${brightness}%) hue-rotate(${hueRotate}deg)`
    );
  }, [effectiveBackgroundUrl, theme, useGridBackground, dimLevel, glassIntensity, glassRefraction]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        accentColor: effectiveAccentColor,
        setAccentColor,
        backgroundUrl: effectiveBackgroundUrl,
        setBackgroundUrl,
        dimLevel,
        setDimLevel,
        glassIntensity,
        setGlassIntensity,
        glassRefraction,
        setGlassRefraction,
        useGridBackground,
        setUseGridBackground,
        toggleTheme,
        setSupportOverride,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
