import { logger } from './loggerService';
// Minimal configuration constants file
// This file ONLY exports constants with no logic to avoid circular dependencies

// Detect environment based on domain when running on web
const Config_constants_LOG = 'config.constants';
const detectEnvironmentFromDomain = (): 'development' | 'production' => {
  // Check if running in browser (web)
  if (typeof globalThis !== 'undefined' && globalThis.window?.location) {
    const hostname = globalThis.window.location.hostname;

    // If on localhost, it's development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      logger.debug(Config_constants_LOG, 'Environment detected from domain (localhost)', {
        hostname,
        inferred: 'development',
      });
      return 'development';
    }

    // If hostname contains 'dev.' it's development environment
    if (hostname.includes('dev.')) {
      logger.debug(Config_constants_LOG, 'Environment detected from domain (dev subdomain)', {
        hostname,
        inferred: 'development',
      });
      return 'development';
    }

    // Otherwise it's production
    logger.debug(Config_constants_LOG, 'Environment detected from domain (production)', {
      hostname,
    });
    return 'production';
  }
  
  // Fallback to environment variables or __DEV__ for non-web platforms
  return (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ENVIRONMENT === 'development')
    || (typeof __DEV__ !== 'undefined' && __DEV__)
    ? 'development'
    : 'production';
};

// Simple environment detection
const projectEnv = detectEnvironmentFromDomain();

export const IS_DEVELOPMENT = projectEnv === 'development';
export const IS_PRODUCTION = projectEnv === 'production';
export const CURRENT_ENVIRONMENT = projectEnv;

// Simple API URL resolution - evaluated at runtime for web
const getSimpleApiUrl = (): string => {
  // Try environment variables first (highest priority - for local development)
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    logger.debug(Config_constants_LOG, 'Using API URL from EXPO_PUBLIC_API_BASE_URL', { url: envUrl });
    return envUrl;
  }

  // For web, detect based on domain at runtime
  if (typeof globalThis !== 'undefined' && globalThis.window?.location) {
    const hostname = globalThis.window.location.hostname;

    // If on localhost, use local server
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      const localUrl = 'http://localhost:3001';
      logger.debug(Config_constants_LOG, 'Using local API URL for web localhost', {
        hostname,
        url: localUrl,
      });
      return localUrl;
    }

    // If on dev domain, use dev server
    if (hostname.includes('dev.')) {
      const devUrl = 'https://kc-mvp-server-development.up.railway.app';
      logger.debug(Config_constants_LOG, 'Using dev API URL for web', { hostname, url: devUrl });
      return devUrl;
    }

    // Otherwise use production server
    const prodUrl = 'https://kc-prod-server-production.up.railway.app';
    logger.debug(Config_constants_LOG, 'Using production API URL for web', {
      hostname,
      url: prodUrl,
    });
    return prodUrl;
  }

  // Fallback to appropriate environment URL for native apps
  return IS_DEVELOPMENT
    ? 'https://kc-mvp-server-development.up.railway.app'
    : 'https://kc-prod-server-production.up.railway.app';
};

// Export as getter function to ensure runtime evaluation
export const getApiUrl = getSimpleApiUrl;

// For backward compatibility, export as constant but it will be evaluated at module load time
// This is a limitation - for true runtime detection, use getApiUrl() function
let _cachedApiUrl: string | null = null;
export const API_BASE_URL = (() => {
  _cachedApiUrl ??= getSimpleApiUrl();
  return _cachedApiUrl;
})();

// Simple feature flags
export const USE_BACKEND = true;
export const USE_FIRESTORE = false;

