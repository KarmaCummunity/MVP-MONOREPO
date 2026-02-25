// File overview:
// - Purpose: Global mode for Web: 'site' (marketing landing) vs 'app' (application UI) using Zustand
// - Reached from: Any component via `useWebMode()` hook, or services via direct import
// - Provides: Simple global mode for Web with localStorage persistence
// - Advantage: Can be used outside React components (in services) without circular dependencies
//
// IMPORTANT BEHAVIOR:
// - Default mode for web is 'site' - new users will see the landing page first
// - Mode persisted in localStorage to remember user preference
// - First-time web visitors always start with 'site' mode (landing page)
// - Navigation automatically handled by MainNavigator based on current mode
// - 'app' mode for mobile platforms by default (no site mode on native)

import { create } from 'zustand';
import { Platform } from 'react-native';

export type WebMode = 'site' | 'app';

interface WebModeState {
  mode: WebMode;
  setMode: (next: WebMode) => void;
  toggleMode: () => void;
  initialize: () => void;
}

const DEFAULT_MODE: WebMode = Platform.OS === 'web' ? 'site' : 'app';
const STORAGE_KEY = 'kc_web_mode';

export const useWebModeStore = create<WebModeState>((set, get) => {
  // Initialize mode immediately if on web (synchronous)
  let initialMode = DEFAULT_MODE;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'site' || stored === 'app') {
        initialMode = stored;
      }
    } catch (_) {
      // Ignore localStorage errors
    }
  }
  
  return {
    mode: initialMode,
    
    setMode: (next: WebMode) => {
      set({ mode: next });
      if (Platform.OS === 'web') {
        try { 
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, next);
          }
        } catch (_) {
          // Ignore localStorage errors
        }
      }
    },
    
    toggleMode: () => {
      const newMode = get().mode === 'site' ? 'app' : 'site';
      set({ mode: newMode });
      if (Platform.OS === 'web') {
        try { 
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, newMode);
          }
        } catch (_) {
          // Ignore localStorage errors
        }
      }
    },
    
    initialize: () => {
      if (Platform.OS !== 'web') {
        set({ mode: 'app' });
        return;
      }
      
      try {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
        if (stored === 'site' || stored === 'app') {
          set({ mode: stored });
        } else {
          // Default to 'site' mode for new users (landing page)
          set({ mode: 'site' });
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, 'site');
          }
        }
      } catch (_) {
        set({ mode: 'site' });
      }
    },
  };
});

// Custom hook (backward compatible API)
export function useWebMode() {
  const store = useWebModeStore();
  return {
    mode: store.mode,
    setMode: store.setMode,
    toggleMode: store.toggleMode,
  };
}

