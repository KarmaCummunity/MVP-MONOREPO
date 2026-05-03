/**
 * Fallback for TypeScript module resolution. Metro prefers tokenManager.web.ts / tokenManager.native.ts when bundling.
 */
export { tokenManager } from './tokenManager.native';
