# Scripts Directory

This directory contains utility scripts for code analysis, testing, and maintenance.

## Directory Structure

### Sonar (root `sonar/` folder)
Scripts and reports for SonarCloud/SonarQube analysis live in **`sonar/`** at repo root:
- `sonar-report.js` – Fetches issues from SonarCloud API and writes a single report to `sonar/docs/SONAR-ALL-ISSUES.md`
- `check-sonar-blocker-critical.js` – Exits with code 1 if BLOCKER/CRITICAL/HIGH issues exist (used by pre-push)
- `pre-push-sonar-check.sh` – Runs Sonar scan for API, then blocks push if BLOCKER/CRITICAL/HIGH exist

**Usage** (from monorepo root):
```bash
SONAR_TOKEN=xxx npm run sonar:report   # Generate sonar/docs/SONAR-ALL-ISSUES.md
npm run sonar:pre-push                 # Run Sonar + block push on blocking issues
```
See `sonar/README.md` for details.

### `code-analysis/`
Scripts for code quality and linting analysis:
- `fix-any.js` - Automated TypeScript `any` type fixes
- `parse-eslint.js` - Parse ESLint reports
- `parse-eslint-easy.js` - Easy fixes from ESLint
- `parse-eslint-deps.js` - React hooks dependency analysis
- `parse-eslint-counts.js` - Count ESLint issues by type

**Usage**: Run from respective app directory (apps/api or apps/mobile)
```bash
cd apps/api && node ../../scripts/code-analysis/fix-any.js
cd apps/mobile && node ../../scripts/code-analysis/parse-eslint.js
```

### `test-utils/`
Testing and debugging utilities:
- `minimal-server.js` - Minimal HTTP server for health checks and debugging

**Usage**:
```bash
node scripts/test-utils/minimal-server.js
```

## Notes

- Most scripts expect to run from specific directories (check script for details)
- Scripts may require input files (JSON reports, etc.) in the working directory
- These are development/maintenance tools - not part of the production build
