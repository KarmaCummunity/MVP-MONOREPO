/**
 * Native-only re-export: Metro must not load `expo-secure-store` on web (it calls
 * requireNativeModule at import time). Use `secureStoreModule` + platform extensions.
 */
export * from 'expo-secure-store';
