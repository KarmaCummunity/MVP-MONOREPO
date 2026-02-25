#!/usr/bin/env ts-node
/**
 * Audit Script: Constants
 * 
 * Purpose: Scans all TypeScript/TSX files to detect magic numbers and
 * hardcoded constants that should be imported from globals/constants.tsx
 * 
 * Detects:
 * - Magic numbers (repeated numeric values)
 * - Hardcoded sizes (fontSize, padding, margin, etc.)
 * - Repeated string constants
 * - Missing constants import
 * 
 * Output: audit-reports/constants-issues.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface ConstantIssue {
  file: string;
  line: number;
  column: number;
  type: 'magic-number' | 'repeated-value' | 'hardcoded-size' | 'missing-import';
  severity: 'critical' | 'high' | 'medium' | 'low';
  value: string | number;
  context: string;
  suggestion: string;
  occurrences?: number;
}

interface ConstantAuditReport {
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
    'magic-number': number;
    'repeated-value': number;
    'hardcoded-size': number;
    'missing-import': number;
  };
  repeatedValues: Map<string, number>;
  issues: ConstantIssue[];
}

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.expo',
  'ios',
  'android',
  'web',
  'globals/constants.tsx', // Don't audit the constants file itself
  'scripts',
  '.git',
  'coverage'
];

// Style properties that should use constants
const SIZE_PROPERTIES = [
  'fontSize',
  'padding',
  'paddingHorizontal',
  'paddingVertical',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'borderRadius',
  'borderWidth',
  'gap',
  'rowGap',
  'columnGap'
];

// Safe numbers that are commonly used and acceptable
const SAFE_NUMBERS = [0, 1, 2, -1, 100];

class ConstantAuditor {
  private report: ConstantAuditReport;
  private rootDir: string;
  private valueOccurrences: Map<string, Array<{ file: string, line: number }>>;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.valueOccurrences = new Map();
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
        'magic-number': 0,
        'repeated-value': 0,
        'hardcoded-size': 0,
        'missing-import': 0
      },
      repeatedValues: new Map(),
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

  private hasConstantsImport(content: string): boolean {
    return /import.*from\s+['"].*globals\/constants['"]/.test(content);
  }

  private isSafeNumber(num: number): boolean {
    return SAFE_NUMBERS.includes(num);
  }

  private trackValue(value: string, filePath: string, line: number): void {
    if (!this.valueOccurrences.has(value)) {
      this.valueOccurrences.set(value, []);
    }
    this.valueOccurrences.get(value)!.push({
      file: path.relative(this.rootDir, filePath),
      line
    });
  }

  private detectHardcodedSizes(content: string, filePath: string, hasImport: boolean): void {
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      // Look for style properties with numeric values
      SIZE_PROPERTIES.forEach(prop => {
        const pattern = new RegExp(`${prop}\\s*:\\s*(\\d+)`, 'g');
        const matches = line.matchAll(pattern);

        for (const match of matches) {
          const value = parseInt(match[1]);
          const column = match.index || 0;

          // Skip safe numbers
          if (this.isSafeNumber(value)) {
            continue;
          }

          // Track this value
          this.trackValue(`${prop}:${value}`, filePath, lineIndex + 1);

          // Check if using responsive functions
          const hasResponsive = /responsive|scaleSize|FontSizes|LAYOUT_CONSTANTS|COMPONENT_SIZES/.test(line);

          if (!hasResponsive) {
            this.addIssue({
              file: path.relative(this.rootDir, filePath),
              line: lineIndex + 1,
              column: column + 1,
              type: 'hardcoded-size',
              severity: 'high',
              value,
              context: line.trim(),
              suggestion: this.getSizeSuggestion(prop, value, hasImport)
            });
          }
        }
      });
    });
  }

  private getSizeSuggestion(property: string, value: number, hasImport: boolean): string {
    if (property === 'fontSize') {
      return hasImport
        ? `Use FontSizes constant: fontSize: FontSizes.body (or appropriate size)`
        : `Import FontSizes from constants and use: fontSize: FontSizes.body`;
    }

    if (property.includes('padding') || property.includes('margin')) {
      return `Use responsiveSpacing(${value}, tablet?, desktop?) for responsive sizing`;
    }

    if (property === 'borderRadius') {
      return hasImport
        ? `Use LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM (or appropriate size)`
        : `Import LAYOUT_CONSTANTS and use BORDER_RADIUS constants`;
    }

    return `Consider using scaleSize(${value}) or adding to constants.tsx`;
  }

  private detectMagicNumbers(content: string, filePath: string): void {
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Skip comments and imports
      if (line.trim().startsWith('//') ||
        line.trim().startsWith('*') ||
        line.trim().startsWith('import')) {
        return;
      }

      // Look for standalone numbers in code (not in style objects)
      // This is a simplified detection - could be improved
      const numberPattern = /\b(\d{2,})\b/g;
      const matches = line.matchAll(numberPattern);

      for (const match of matches) {
        const value = parseInt(match[1]);
        const column = match.index || 0;

        // Skip safe numbers and years
        if (this.isSafeNumber(value) || value > 1900) {
          continue;
        }

        // Skip if it's part of a style property (already handled)
        const beforeMatch = line.substring(Math.max(0, column - 20), column);
        if (SIZE_PROPERTIES.some(prop => beforeMatch.includes(prop))) {
          continue;
        }

        // Track this value
        this.trackValue(`number:${value}`, filePath, lineIndex + 1);
      }
    });
  }

  private detectMissingImport(content: string, filePath: string): void {
    const hasImport = this.hasConstantsImport(content);

    // Check if file uses style-related code
    const hasStyles = /StyleSheet\.create|fontSize|padding|margin/.test(content);

    if (hasStyles && !hasImport) {
      this.addIssue({
        file: path.relative(this.rootDir, filePath),
        line: 1,
        column: 1,
        type: 'missing-import',
        severity: 'medium',
        value: 'N/A',
        context: 'File uses styles but does not import from globals/constants.tsx',
        suggestion: `Add: import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';`
      });
    }
  }

  private addIssue(issue: ConstantIssue): void {
    this.report.issues.push(issue);
    this.report.totalIssues++;
    this.report.issuesBySeverity[issue.severity]++;
    this.report.issuesByType[issue.type]++;
  }

  private auditFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasImport = this.hasConstantsImport(content);

      const issuesBeforeFile = this.report.totalIssues;

      this.detectHardcodedSizes(content, filePath, hasImport);
      this.detectMagicNumbers(content, filePath);
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

  private analyzeRepeatedValues(): void {
    // Find values that appear more than once
    this.valueOccurrences.forEach((occurrences, value) => {
      if (occurrences.length > 1) {
        this.report.repeatedValues.set(value, occurrences.length);

        // Add an issue for the first occurrence
        const first = occurrences[0];
        this.addIssue({
          file: first.file,
          line: first.line,
          column: 1,
          type: 'repeated-value',
          severity: occurrences.length > 5 ? 'high' : 'medium',
          value,
          context: `Value appears ${occurrences.length} times across the codebase`,
          suggestion: `Consider extracting "${value}" to a constant in globals/constants.tsx`,
          occurrences: occurrences.length
        });
      }
    });
  }

  public audit(): ConstantAuditReport {
    console.log('🔢 Starting constants audit...\n');

    const files = this.getAllFiles(this.rootDir);
    console.log(`Found ${files.length} TypeScript files to audit\n`);

    files.forEach((file, index) => {
      if (index % 10 === 0) {
        process.stdout.write(`\rProgress: ${index}/${files.length} files`);
      }
      this.auditFile(file);
    });

    process.stdout.write(`\rProgress: ${files.length}/${files.length} files ✓\n\n`);

    console.log('Analyzing repeated values...');
    this.analyzeRepeatedValues();

    return this.report;
  }

  public saveReport(outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Convert Map to object for JSON serialization
    const reportToSave = {
      ...this.report,
      repeatedValues: Object.fromEntries(this.report.repeatedValues)
    };

    fs.writeFileSync(outputPath, JSON.stringify(reportToSave, null, 2));
    console.log(`\n📊 Report saved to: ${outputPath}`);
  }

  public printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('CONSTANTS AUDIT SUMMARY');
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
    console.log(`  Magic numbers:    ${this.report.issuesByType['magic-number']}`);
    console.log(`  Repeated values:  ${this.report.issuesByType['repeated-value']}`);
    console.log(`  Hardcoded sizes:  ${this.report.issuesByType['hardcoded-size']}`);
    console.log(`  Missing imports:  ${this.report.issuesByType['missing-import']}\n`);

    if (this.report.repeatedValues.size > 0) {
      console.log('Top 10 most repeated values:');
      const sorted = Array.from(this.report.repeatedValues.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      sorted.forEach(([value, count], index) => {
        console.log(`  ${index + 1}. ${value} (${count} occurrences)`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// Main execution
if (require.main === module) {
  const rootDir = path.join(__dirname, '..');
  const outputPath = path.join(rootDir, 'audit-reports', 'constants-issues.json');

  const auditor = new ConstantAuditor(rootDir);
  auditor.audit();
  auditor.saveReport(outputPath);
  auditor.printSummary();

  process.exit(0);
}

export { ConstantAuditor, ConstantAuditReport, ConstantIssue };




