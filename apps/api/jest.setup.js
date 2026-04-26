// Global test defaults so Jest behaves the same from repo root or apps/api (cwd-independent).

process.env.NODE_ENV = "test";
process.env.GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "test-client-id-for-testing";
process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "test-web-client-id-for-testing";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://kc:local-dev-secret@localhost:5432/kc_test_db";
process.env.REDIS_URL =
  process.env.TEST_REDIS_URL || "redis://localhost:6379/1";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  "test-secret-key-for-unit-tests-32chars-minimum-length!!";

jest.setTimeout(10000);
