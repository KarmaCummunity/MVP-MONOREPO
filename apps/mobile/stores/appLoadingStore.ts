// File overview:
// - Purpose: Centralized loading state management using Zustand (replaces AppLoadingContext)
// - Reached from: Any component via `useAppLoading()` hook, or services via direct import
// - Provides: Unified loading state management for different app components/features
// - Advantage: Can be used outside React components (in services) without circular dependencies

import { create } from 'zustand';
import { logger } from '../utils/loggerService';

// Loading states for different app components/features
export interface LoadingStates {
  app: boolean;           // Overall app initialization
  fonts: boolean;         // Font loading
  language: boolean;      // Language/i18n setup  
  notifications: boolean; // Notification service setup
  user: boolean;          // User authentication/profile
  navigation: boolean;    // Navigation setup
}

// Loading errors for different components
export interface LoadingErrors {
  app: Error | null;
  fonts: Error | null;
  language: Error | null;
  notifications: Error | null;
  user: Error | null;
  navigation: Error | null;
}

interface AppLoadingState {
  loading: LoadingStates;
  errors: LoadingErrors;
  isAppReady: boolean;
  
  // Actions
  setLoading: (component: keyof LoadingStates, loading: boolean) => void;
  setError: (component: keyof LoadingErrors, error: Error | null) => void;
  resetComponent: (component: keyof LoadingStates) => void;
  resetAll: () => void;
  markAppReady: () => void;
  
  // Convenience getters
  isLoading: (component?: keyof LoadingStates) => boolean;
  hasError: (component?: keyof LoadingErrors) => boolean;
  getError: (component: keyof LoadingErrors) => Error | null;
  
  // Composite state checkers
  isAnyLoading: () => boolean;
  hasAnyError: () => boolean;
  getCriticalError: () => Error | null; // Returns first critical error (app, fonts)
}

const initialState: AppLoadingState = {
  loading: {
    app: true,
    fonts: false,
    language: false,
    notifications: false,
    user: false,
    navigation: false,
  },
  errors: {
    app: null,
    fonts: null,
    language: null,
    notifications: null,
    user: null,
    navigation: null,
  },
  isAppReady: false,
  setLoading: () => {},
  setError: () => {},
  resetComponent: () => {},
  resetAll: () => {},
  markAppReady: () => {},
  isLoading: () => false,
  hasError: () => false,
  getError: () => null,
  isAnyLoading: () => false,
  hasAnyError: () => false,
  getCriticalError: () => null,
};

export const useAppLoadingStore = create<AppLoadingState>((set, get) => ({
  ...initialState,
  
  setLoading: (component: keyof LoadingStates, loading: boolean) => {
    const newLoading = { ...get().loading, [component]: loading };
    
    // Log the loading state change
    logger.debug('AppLoading', 'Loading state changed', {
      component,
      loading,
      allStates: newLoading
    });
    
    set({
      loading: newLoading,
      // Clear error when starting to load
      errors: loading 
        ? { ...get().errors, [component]: null }
        : get().errors
    });
  },
  
  setError: (component: keyof LoadingErrors, error: Error | null) => {
    logger.error('AppLoading', 'Loading error set', {
      component,
      error
    });
    
    set({
      loading: { ...get().loading, [component]: false },
      errors: { ...get().errors, [component]: error }
    });
  },
  
  resetComponent: (component: keyof LoadingStates) => {
    logger.debug('AppLoading', 'Component reset', { component });
    
    set({
      loading: { ...get().loading, [component]: false },
      errors: { ...get().errors, [component]: null }
    });
  },
  
  resetAll: () => {
    logger.info('AppLoading', 'All loading states reset');
    set(initialState);
  },
  
  markAppReady: () => {
    logger.info('AppLoading', 'App marked as ready');
    set({
      isAppReady: true,
      loading: { ...get().loading, app: false }
    });
  },
  
  isLoading: (component?: keyof LoadingStates) => {
    if (component) {
      return get().loading[component];
    }
    return get().loading.app; // Default to app loading
  },
  
  hasError: (component?: keyof LoadingErrors) => {
    if (component) {
      return get().errors[component] !== null;
    }
    return Object.values(get().errors).some(error => error !== null);
  },
  
  getError: (component: keyof LoadingErrors) => {
    return get().errors[component];
  },
  
  isAnyLoading: () => {
    return Object.values(get().loading).some(loading => loading);
  },
  
  hasAnyError: () => {
    return Object.values(get().errors).some(error => error !== null);
  },
  
  getCriticalError: () => {
    // Critical errors that should show error screen
    const criticalComponents: (keyof LoadingErrors)[] = ['app'];
    
    for (const component of criticalComponents) {
      const error = get().errors[component];
      if (error) {
        return error;
      }
    }
    return null;
  },
}));

// Custom hook to use the loading store (backward compatible API)
export function useAppLoading() {
  const store = useAppLoadingStore();
  return {
    state: {
      loading: store.loading,
      errors: store.errors,
      isAppReady: store.isAppReady,
    },
    setLoading: store.setLoading,
    setError: store.setError,
    resetComponent: store.resetComponent,
    resetAll: store.resetAll,
    markAppReady: store.markAppReady,
    isLoading: store.isLoading,
    hasError: store.hasError,
    getError: store.getError,
    isAnyLoading: store.isAnyLoading,
    hasAnyError: store.hasAnyError,
    getCriticalError: store.getCriticalError,
  };
}

// Hook for managing a specific component's loading state
export function useComponentLoading(component: keyof LoadingStates) {
  const store = useAppLoadingStore();
  
  return {
    isLoading: store.isLoading(component),
    error: store.getError(component),
    startLoading: () => store.setLoading(component, true),
    stopLoading: () => store.setLoading(component, false),
    setError: (error: Error | null) => store.setError(component, error),
    reset: () => store.resetComponent(component),
  };
}

