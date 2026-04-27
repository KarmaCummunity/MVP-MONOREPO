import { randomUUID } from 'expo-crypto';

/** Client-side IDs only (not secrets). Uses UUID v4 instead of Math.random(). */
export const generateId = (prefix: string): string => `${prefix}_${randomUUID()}`;
