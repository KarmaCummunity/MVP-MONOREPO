/**
 * Fallback module for TypeScript and non-platform-aware resolution.
 * Metro still prefers `secureStoreModule.web.ts` / `secureStoreModule.native.ts` when bundling.
 */
export * from 'expo-secure-store';
