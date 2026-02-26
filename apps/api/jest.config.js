module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    // Support for tsconfig-paths
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/minimal-server.ts',
    '!src/sanity.ts',
    '!src/**/*.module.ts',
    '!src/database/schema.sql',
    '!src/database/**/*.sql',
    '!src/scripts/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Spec files are excluded from build via tsconfig.build.json
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};


