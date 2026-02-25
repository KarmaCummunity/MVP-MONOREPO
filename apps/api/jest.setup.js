// Jest setup file - רץ לפני כל בדיקה
// כאן אפשר להגדיר mocks גלובליים, timers וכו'

// הגדרת environment variables לבדיקות (חייב להיות כאן!)
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id-for-testing';
process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'test-web-client-id-for-testing';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://kc:local-dev-secret@localhost:5432/kc_test_db';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

// Mock console methods אם צריך (לא להציף את הלוגים בבדיקות)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// הגדרת timeout גלובלי (אופציונלי)
jest.setTimeout(10000); // 10 שניות

