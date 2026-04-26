# Audit Scripts - documentation

## Overview

These scripts automatically scan all the code files in the MVP to detect infrastructure problems:

- **audit-colors.ts** - Identifies hard colors that should come from `globals/colors.tsx`
- **audit-texts.ts** - Identifies hard texts that need to go through i18n
- **audit-constants.ts** - Identifies magic numbers and constants that should be in `globals/constants.tsx`
- **audit-responsive.ts** - Identifies responsive problems and incorrect use of functions
- **find-unused-files.ts** - Identifies unused, duplicate and old files
- **audit-all.ts** - Runs all scripts and produces a consolidated report

## installation

Before first run, install the dependencies:

```bash
npm install
```

The scripts need:
- `ts-node` - to run TypeScript directly
- `@types/node` - Node.js types

## Usage

### Running a single script

```bash
# Color check
npm run audit:colors

# Checking texts
npm run audit:texts

# Checking constants
npm run audit:constants

# Responsive testing
npm run audit:responsive

# Check for unused files
npm run audit: unused
```

### Running all the tests

```bash
npm run audit:all
```

This will run all 5 scripts and create a consolidated report.

## Output

All reports are saved in the `audit-reports/` folder:

```
audit-reports/
├── colors-issues.json # All color issues
├── texts-issues.json # All text issues
├── constants-issues.json # All constants issues
├── responsive-issues.json # All responsive issues
├── unused-files.json # All unused files
├── master-report.json # Consolidated JSON report
└── summary.md # Readable summary in Hebrew
```

### Reading the reports

1. **summary.md** - Start here! It's a readable summary with prioritization and an action plan
2. **\*-issues.json** - Detailed reports with exact location of each issue

## The structure of the report

Each JSON report contains:

```typescript
{
  "timestamp": "2025-01-01T00:00:00.000Z",
  "totalFiles": 138,
  "filesWithIssues": 45,
  "totalIssues": 234,
  "issuesBySeverity": {
    "critical": 12,
    "high": 56,
    "medium": 89,
    "low": 77
  },
  "issues": [
    {
      "file": "components/HeaderComp.tsx",
      "line": 42,
      "column": 15,
      "type": "hex",
      "severity": "high",
      "value": "#16808C",
      "context": "backgroundColor: '#16808C'",
      "suggestion": "Replace #16808C with colors.primary"
    }
    // ... more problems
  ]
}
```

## Severity levels

- **🔴 Critical** - critical problems that need to be fixed immediately (for example: missing import in the production file)
- **🟠 High** - important problems that need to be fixed soon (for example: hard colors)
- ** 🟡 Medium** - problems that should be fixed (for example: recurring constants)
- **🟢 Low** - minor or cosmetic problems (eg: old files)

## Usage examples

### Finding all solid colors in a particular file

```bash
npm run audit:colors
# Then look in the colors-issues.json file for the specific file
```

### Finding all Hebrew texts that do not go through i18n

```bash
npm run audit:texts
# Check hardcoded-hebrew in texts-issues.json
```

### Identify duplicate files

```bash
npm run audit: unused
# Check type: "duplicate" in unused-files.json
```

## Tips

1. **Run before corrections** - to get a baseline of the current situation
2. **Run after repairs** - to make sure the problems are solved
3. **Save the reports** - to track progress over time
4. **Focus on high severity** - fix critical and high first
5. **Work on one file at a time** - Don't try to fix everything at once

## Frequently asked questions

### Why is the script taking time?

The scripts scan about 200 files. It takes 2-5 minutes.

### Is it safe to run?

yes! The scripts only **read** files and do not change anything. They just generate reports.

### What if there are false positives?

It can happen. Check the context in the report and use discretion.

### How do I fix the problems?

1. Read `summary.md` for an action plan
2. Open the relevant detailed report
3. Go over each problem and fix according to the suggestion
4. Run the script again to verify

## Donation

If you want to improve the scripts:

1. The scripts are written in TypeScript with detailed comments
2. Each script is standalone and can be run independently
3. Additional tests can be added easily

## license

Part of the KarmaCommunity project - 0BSD License