module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    // Support for tsconfig-paths (כבר קיים בפרויקט)
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/main-improved.ts',
    '!src/minimal-server.ts',
    '!src/sanity.ts',
    '!src/**/*.module.ts',
    '!src/database/schema.sql',
    '!src/database/**/*.sql',
    '!src/scripts/**', // Scripts לא נכללים ב-coverage
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // חשוב: tsconfig.build.json כבר מוציא את **/*.spec.ts - זה בסדר
  // הבדיקות לא יכנסו ל-build
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};


