// AppLoadingContext.tsx
// Purpose: Centralized loading state management for the entire application
// Replaces scattered local loading states with a unified, manageable system

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
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
}

// Action types for the reducer
type LoadingAction = 
  | { type: 'SET_LOADING'; component: keyof LoadingStates; loading: boolean }
  | { type: 'SET_ERROR'; component: keyof LoadingErrors; error: Error | null }
  | { type: 'RESET_COMPONENT'; component: keyof LoadingStates }
  | { type: 'RESET_ALL' }
  | { type: 'APP_READY' };

// Initial state
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
};

// Reducer to manage loading states
function appLoadingReducer(state: AppLoadingState, action: LoadingAction): AppLoadingState {
  switch (action.type) {
    case 'SET_LOADING': {
      const newLoading = { ...state.loading, [action.component]: action.loading };
      
      // Log the loading state change
      logger.debug('AppLoading', 'Loading state changed', {
        component: action.component,
        loading: action.loading,
        allStates: newLoading
      });
      
      return {
        ...state,
        loading: newLoading,
        // Clear error when starting to load
        errors: action.loading 
          ? { ...state.errors, [action.component]: null }
          : state.errors
      };
    }
    
    case 'SET_ERROR': {
      logger.error('AppLoading', 'Loading error set', {
        component: action.component,
        error: action.error
      });
      
      return {
        ...state,
        loading: { ...state.loading, [action.component]: false },
        errors: { ...state.errors, [action.component]: action.error }
      };
    }
    
    case 'RESET_COMPONENT': {
      logger.debug('AppLoading', 'Component reset', { component: action.component });
      
      return {
        ...state,
        loading: { ...state.loading, [action.component]: false },
        errors: { ...state.errors, [action.component]: null }
      };
    }
    
    case 'RESET_ALL': {
      logger.info('AppLoading', 'All loading states reset');
      return initialState;
    }
    
    case 'APP_READY': {
      logger.info('AppLoading', 'App marked as ready');
      return {
        ...state,
        isAppReady: true,
        loading: { ...state.loading, app: false }
      };
    }
    
    default:
      return state;
  }
}

// Context interface
interface AppLoadingContextType {
  state: AppLoadingState;
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

// Create context
const AppLoadingContext = createContext<AppLoadingContextType | undefined>(undefined);

// Provider component
interface AppLoadingProviderProps {
  children: ReactNode;
}

export function AppLoadingProvider({ children }: AppLoadingProviderProps) {
  const [state, dispatch] = useReducer(appLoadingReducer, initialState);
  
  // Action creators
  const setLoading = useCallback((component: keyof LoadingStates, loading: boolean) => {
    dispatch({ type: 'SET_LOADING', component, loading });
  }, []);
  
  const setError = useCallback((component: keyof LoadingErrors, error: Error | null) => {
    dispatch({ type: 'SET_ERROR', component, error });
  }, []);
  
  const resetComponent = useCallback((component: keyof LoadingStates) => {
    dispatch({ type: 'RESET_COMPONENT', component });
  }, []);
  
  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);
  
  const markAppReady = useCallback(() => {
    dispatch({ type: 'APP_READY' });
  }, []);
  
  // Convenience getters
  const isLoading = useCallback((component?: keyof LoadingStates) => {
    if (component) {
      return state.loading[component];
    }
    return state.loading.app; // Default to app loading
  }, [state.loading]);
  
  const hasError = useCallback((component?: keyof LoadingErrors) => {
    if (component) {
      return state.errors[component] !== null;
    }
    return Object.values(state.errors).some(error => error !== null);
  }, [state.errors]);
  
  const getError = useCallback((component: keyof LoadingErrors) => {
    return state.errors[component];
  }, [state.errors]);
  
  // Composite state checkers
  const isAnyLoading = useCallback(() => {
    return Object.values(state.loading).some(loading => loading);
  }, [state.loading]);
  
  const hasAnyError = useCallback(() => {
    return Object.values(state.errors).some(error => error !== null);
  }, [state.errors]);
  
  const getCriticalError = useCallback(() => {
    // Critical errors that should show error screen
    const criticalComponents: (keyof LoadingErrors)[] = ['app'];
    
    for (const component of criticalComponents) {
      if (state.errors[component]) {
        return state.errors[component];
      }
    }
    return null;
  }, [state.errors]);
  
  const contextValue: AppLoadingContextType = {
    state,
    setLoading,
    setError,
    resetComponent,
    resetAll,
    markAppReady,
    isLoading,
    hasError,
    getError,
    isAnyLoading,
    hasAnyError,
    getCriticalError,
  };
  
  return (
    <AppLoadingContext.Provider value={contextValue}>
      {children}
    </AppLoadingContext.Provider>
  );
}

// Custom hook to use the loading context
export function useAppLoading(): AppLoadingContextType {
  const context = useContext(AppLoadingContext);
  
  if (context === undefined) {
    throw new Error('useAppLoading must be used within an AppLoadingProvider');
  }
  
  return context;
}

// Hook for managing a specific component's loading state
export function useComponentLoading(component: keyof LoadingStates) {
  const { setLoading, setError, isLoading, getError, resetComponent } = useAppLoading();
  
  const startLoading = useCallback(() => {
    setLoading(component, true);
  }, [setLoading, component]);
  
  const stopLoading = useCallback(() => {
    setLoading(component, false);
  }, [setLoading, component]);
  
  const setComponentError = useCallback((error: Error | null) => {
    setError(component, error);
  }, [setError, component]);
  
  const resetComponentState = useCallback(() => {
    resetComponent(component);
  }, [resetComponent, component]);
  
  return {
    isLoading: isLoading(component),
    error: getError(component),
    startLoading,
    stopLoading,
    setError: setComponentError,
    reset: resetComponentState,
  };
}
