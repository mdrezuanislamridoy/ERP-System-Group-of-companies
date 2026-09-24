import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'okobiz-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function applyResolvedTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(getStoredPreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    theme === 'system' ? getSystemTheme() : theme
  );

  useEffect(() => {
    const next = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(next);
    applyResolvedTheme(next);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = getSystemTheme();
      setResolvedTheme(next);
      applyResolvedTheme(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
