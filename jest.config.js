/**
 * When Jest runs from the monorepo root (e.g. Cursor/VS Code "Run Test"),
 * a single default transform would pick the wrong stack (Babel without TS for API).
 * Projects delegate each app to its own jest.config.js.
 */
module.exports = {
  projects: ["<rootDir>/apps/api", "<rootDir>/apps/mobile"],
};
