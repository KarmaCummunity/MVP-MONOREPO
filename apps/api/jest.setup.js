// Jest setup — runs before each test file
// Global env and defaults for the API test harness

process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || 'test-client-id-for-testing';
process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  'test-web-client-id-for-testing';
// No password in repo: real CI URLs come from TEST_DATABASE_URL (see workflow / local .env)
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://test@127.0.0.1:5432/postgres';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

jest.setTimeout(10000);
