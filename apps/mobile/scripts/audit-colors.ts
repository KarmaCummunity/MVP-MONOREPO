#!/usr/bin/env ts-node
/**
 * Audit Script: Colors
 * 
 * Purpose: Scans all TypeScript/TSX files to detect hardcoded colors
 * that should be imported from globals/colors.tsx
 * 
 * Detects:
 * - Hex colors (#RRGGBB, #RGB)
 * - RGB/RGBA colors
 * - Named colors (red, blue, etc.)
 * - Inline color styles
 * - Colors not imported from globals/colors.tsx
 * 
 * Output: audit-reports/colors-issues.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface ColorIssue {
  file: string;
  line: number;
  column: number;
  type: 'hex' | 'rgb' | 'named' | 'inline' | 'missing-import';
  severity: 'critical' | 'high' | 'medium' | 'low';
  value: string;
  context: string;
  suggestion: string;
}

interface ColorAuditReport {
  timestamp: string;
  totalFiles: number;
  filesWithIssues: number;
  totalIssues: number;
  issuesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  issuesByType: {
    hex: number;
    rgb: number;
    named: number;
    inline: number;
    'missing-import': number;
  };
  issues: ColorIssue[];
}

// Regex patterns
const HEX_COLOR_PATTERN = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
const RGB_COLOR_PATTERN = /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)/g;
const NAMED_COLORS = [
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
  'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
  'teal', 'olive', 'maroon', 'aqua', 'silver', 'gold'
];

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.expo',
  'ios',
  'android',
  'web',
  'globals/colors.tsx', // Don't audit the colors file itself
  'scripts', // Don't audit scripts
  '.git',
  'coverage'
];

// Known safe colors (from globals/colors.tsx)
const SAFE_COLORS = [
  'transparent',
  'inherit',
  'currentColor'
];

class ColorAuditor {
  private report: ColorAuditReport;
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.report = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      filesWithIssues: 0,
      totalIssues: 0,
      issuesBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      issuesByType: {
        hex: 0,
        rgb: 0,
        named: 0,
        inline: 0,
        'missing-import': 0
      },
      issues: []
    };
  }

  private shouldExclude(filePath: string): boolean {
    return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
  }

  private isTypeScriptFile(filePath: string): boolean {
    return /\.(ts|tsx)$/.test(filePath);
  }

  private getAllFiles(dir: string): string[] {
    let results: string[] = [];

    try {
      const list = fs.readdirSync(dir);

      list.forEach(file => {
        const filePath = path.join(dir, file);

        if (this.shouldExclude(filePath)) {
          return;
        }

        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          results = results.concat(this.getAllFiles(filePath));
        } else if (this.isTypeScriptFile(filePath)) {
          results.push(filePath);
        }
      });
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }

    return results;
  }

  private hasColorsImport(content: string): boolean {
    return /import\s+.*colors.*from\s+['"].*globals\/colors['"]/.test(content);
  }

  private detectHexColors(content: string, filePath: string, hasImport: boolean): void {
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      const matches = line.matchAll(HEX_COLOR_PATTERN);

      for (const match of matches) {
        const value = match[0];
        const column = match.index || 0;

        // Skip if it's in a comment
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }

        this.addIssue({
          file: path.relative(this.rootDir, filePath),
          line: lineIndex + 1,
          column: column + 1,
          type: 'hex',
          severity: hasImport ? 'high' : 'critical',
          value,
          context: line.trim(),
          suggestion: hasImport
            ? `Replace ${value} with a color from colors.tsx (e.g., colors.primary)`
            : `Import colors and replace ${value} with a color from colors.tsx`
        });
      }
    });
  }

  private detectRgbColors(content: string, filePath: string, hasImport: boolean): void {
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      const matches = line.matchAll(RGB_COLOR_PATTERN);

      for (const match of matches) {
        const value = match[0];
        const column = match.index || 0;

        // Skip if it's in a comment
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }

        this.addIssue({
          file: path.relative(this.rootDir, filePath),
          line: lineIndex + 1,
          column: column + 1,
          type: 'rgb',
          severity: hasImport ? 'high' : 'critical',
          value,
          context: line.trim(),
          suggestion: hasImport
            ? `Replace ${value} with a color from colors.tsx`
            : `Import colors and replace ${value} with a color from colors.tsx`
        });
      }
    });
  }

  private detectNamedColors(content: string, filePath: string, hasImport: boolean): void {
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Look for color: 'colorname' or color: "colorname" or backgroundColor: 'colorname'
      const colorPropertyPattern = /(color|backgroundColor|borderColor|shadowColor|tintColor):\s*['"](\w+)['"]/gi;
      const matches = line.matchAll(colorPropertyPattern);

      for (const match of matches) {
        const colorName = match[2].toLowerCase();
        const fullMatch = match[0];
        const column = match.index || 0;

        // Skip if it's a safe color or not a named color
        if (SAFE_COLORS.includes(colorName) || !NAMED_COLORS.includes(colorName)) {
          continue;
        }

        // Skip if it's in a comment
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }

        this.addIssue({
          file: path.relative(this.rootDir, filePath),
          line: lineIndex + 1,
          column: column + 1,
          type: 'named',
          severity: 'medium',
          value: colorName,
          context: line.trim(),
          suggestion: hasImport
            ? `Replace '${colorName}' with a semantic color from colors.tsx`
            : `Import colors and replace '${colorName}' with a semantic color`
        });
      }
    });
  }

  private detectMissingImport(content: string, filePath: string): void {
    const hasImport = this.hasColorsImport(content);

    // Check if file has any color-related properties
    const hasColorUsage = /color|backgroundColor|borderColor|shadowColor|tintColor/i.test(content);

    if (hasColorUsage && !hasImport) {
      this.addIssue({
        file: path.relative(this.rootDir, filePath),
        line: 1,
        column: 1,
        type: 'missing-import',
        severity: 'high',
        value: 'N/A',
        context: 'File uses colors but does not import from globals/colors.tsx',
        suggestion: `Add: import colors from '../globals/colors';`
      });
    }
  }

  private addIssue(issue: ColorIssue): void {
    this.report.issues.push(issue);
    this.report.totalIssues++;
    this.report.issuesBySeverity[issue.severity]++;
    this.report.issuesByType[issue.type]++;
  }

  private auditFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasImport = this.hasColorsImport(content);

      const issuesBeforeFile = this.report.totalIssues;

      this.detectHexColors(content, filePath, hasImport);
      this.detectRgbColors(content, filePath, hasImport);
      this.detectNamedColors(content, filePath, hasImport);
      this.detectMissingImport(content, filePath);

      const issuesAfterFile = this.report.totalIssues;

      if (issuesAfterFile > issuesBeforeFile) {
        this.report.filesWithIssues++;
      }

      this.report.totalFiles++;
    } catch (error) {
      console.error(`Error auditing file ${filePath}:`, error);
    }
  }

  public audit(): ColorAuditReport {
    console.log('🎨 Starting color audit...\n');

    const files = this.getAllFiles(this.rootDir);
    console.log(`Found ${files.length} TypeScript files to audit\n`);

    files.forEach((file, index) => {
      if (index % 10 === 0) {
        process.stdout.write(`\rProgress: ${index}/${files.length} files`);
      }
      this.auditFile(file);
    });

    process.stdout.write(`\rProgress: ${files.length}/${files.length} files ✓\n\n`);

    return this.report;
  }

  public saveReport(outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(this.report, null, 2));
    console.log(`\n📊 Report saved to: ${outputPath}`);
  }

  public printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('COLOR AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nTotal files scanned: ${this.report.totalFiles}`);
    console.log(`Files with issues: ${this.report.filesWithIssues}`);
    console.log(`Total issues found: ${this.report.totalIssues}\n`);

    console.log('Issues by severity:');
    console.log(`  🔴 Critical: ${this.report.issuesBySeverity.critical}`);
    console.log(`  🟠 High:     ${this.report.issuesBySeverity.high}`);
    console.log(`  🟡 Medium:   ${this.report.issuesBySeverity.medium}`);
    console.log(`  🟢 Low:      ${this.report.issuesBySeverity.low}\n`);

    console.log('Issues by type:');
    console.log(`  Hex colors:       ${this.report.issuesByType.hex}`);
    console.log(`  RGB colors:       ${this.report.issuesByType.rgb}`);
    console.log(`  Named colors:     ${this.report.issuesByType.named}`);
    console.log(`  Inline styles:    ${this.report.issuesByType.inline}`);
    console.log(`  Missing imports:  ${this.report.issuesByType['missing-import']}\n`);

    if (this.report.totalIssues > 0) {
      console.log('Top 5 files with most issues:');
      const fileIssueCount = new Map<string, number>();
      this.report.issues.forEach(issue => {
        fileIssueCount.set(issue.file, (fileIssueCount.get(issue.file) || 0) + 1);
      });

      const sorted = Array.from(fileIssueCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      sorted.forEach(([file, count], index) => {
        console.log(`  ${index + 1}. ${file} (${count} issues)`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// Main execution
if (require.main === module) {
  const rootDir = path.join(__dirname, '..');
  const outputPath = path.join(rootDir, 'audit-reports', 'colors-issues.json');

  const auditor = new ColorAuditor(rootDir);
  auditor.audit();
  auditor.saveReport(outputPath);
  auditor.printSummary();

  process.exit(0);
}

export { ColorAuditor, ColorAuditReport, ColorIssue };




