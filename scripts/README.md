# Scripts Directory

This directory contains utility scripts for code analysis, testing, and maintenance.

## Directory Structure

### `sonar-analysis/`
Scripts for analyzing SonarQube scan results:
- `analyze-sonar-issues.js` - Main analysis of SonarQube issues
- `analyze-stats-controller.js` - Specific analysis for stats controller
- `analyze-users-controller.js` - Specific analysis for users controller
- `compare-results.js` - Compare old vs new scan results
- `create-priority-doc.js` - Generate prioritized issue documentation

**Usage**: Run from monorepo root after SonarQube scan
```bash
node scripts/sonar-analysis/analyze-sonar-issues.js
```

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
