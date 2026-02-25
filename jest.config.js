/**
 * Root Jest config for monorepo.
 * When IDE runs Jest from root, it uses workspace-specific configs via projects.
 * Run: npx jest (all) or npx jest --projects apps/api (API only)
 */
module.exports = {
  projects: ['<rootDir>/apps/api'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
