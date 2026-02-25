// WebModeContext.tsx
// Provides a simple global mode for Web: 'site' (marketing landing) vs 'app' (application UI)
//
// IMPORTANT BEHAVIOR:
// - Default mode for web is 'site' - new users will see the landing page first
// - Mode persisted in localStorage to remember user preference
// - First-time web visitors always start with 'site' mode (landing page)
// - Navigation automatically handled by MainNavigator based on current mode
// - 'app' mode for mobile platforms by default (no site mode on native)
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type WebMode = 'site' | 'app';

interface WebModeContextValue {
  mode: WebMode;
  setMode: (next: WebMode) => void;
  toggleMode: () => void;
}

const DEFAULT_MODE: WebMode = Platform.OS === 'web' ? 'site' : 'app';
const STORAGE_KEY = 'kc_web_mode';

const WebModeContext = createContext<WebModeContextValue | undefined>(undefined);

const getInitialMode = (): WebMode => {
  if (Platform.OS !== 'web') return DEFAULT_MODE;
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    return (stored === 'site' || stored === 'app') ? stored : 'site';
  } catch {
    return 'site';
  }
};

export const WebModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<WebMode>(getInitialMode);

  const setMode = useCallback((next: WebMode) => {
    setModeState(next);
    if (Platform.OS === 'web') {
      try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* localStorage may fail in private mode */ }
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'site' ? 'app' : 'site'));
    if (Platform.OS === 'web') {
      const newMode = mode === 'site' ? 'app' : 'site';
      try { window.localStorage.setItem(STORAGE_KEY, newMode); } catch { /* localStorage may fail in private mode */ }
    }
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode]);

  return (
    <WebModeContext.Provider value={value}>{children}</WebModeContext.Provider>
  );
};

export function useWebMode(): WebModeContextValue {
  const ctx = useContext(WebModeContext);
  if (!ctx) throw new Error('useWebMode must be used within a WebModeProvider');
  return ctx;
}


