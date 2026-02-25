module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    // תמיכה ב-Expo 53, React 19, React Native 0.79.5
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/react-native-skia)',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/scripts/**', // scripts לא נכללים ב-coverage
    '!**/audit-reports/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // תמיכה ב-tsconfig.json הקיים
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'node', // משתמש ב-node environment לבדיקות utils
};

