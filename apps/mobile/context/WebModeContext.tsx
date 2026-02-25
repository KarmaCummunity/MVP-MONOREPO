// WebModeContext.tsx
// Provides a simple global mode for Web: 'site' (marketing landing) vs 'app' (application UI)
//
// IMPORTANT BEHAVIOR:
// - Default mode for web is 'site' - new users will see the landing page first
// - Mode persisted in localStorage to remember user preference
// - First-time web visitors always start with 'site' mode (landing page)
// - Navigation automatically handled by MainNavigator based on current mode
// - 'app' mode for mobile platforms by default (no site mode on native)
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

export const WebModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<WebMode>(DEFAULT_MODE);

  // Initialize from localStorage on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (stored === 'site' || stored === 'app') {
        setModeState(stored);
      } else {
        setModeState('site');
      }
    } catch (_) {
      setModeState('site');
    }
  }, []);

  const setMode = useCallback((next: WebMode) => {
    setModeState(next);
    if (Platform.OS === 'web') {
      try { window.localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'site' ? 'app' : 'site'));
    if (Platform.OS === 'web') {
      const newMode = mode === 'site' ? 'app' : 'site';
      try { window.localStorage.setItem(STORAGE_KEY, newMode); } catch (_) {}
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


