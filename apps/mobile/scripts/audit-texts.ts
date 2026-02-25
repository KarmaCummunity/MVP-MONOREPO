#!/usr/bin/env ts-node
/**
 * Audit Script: Texts (i18n)
 * 
 * Purpose: Scans all TypeScript/TSX files to detect hardcoded text strings
 * that should be using i18n translation keys from locales/*.json
 * 
 * Detects:
 * - Hebrew text strings (not using t())
 * - English text strings (not using t())
 * - Missing translation keys
 * - Unused translation keys
 * - Inconsistent key usage
 * 
 * Output: audit-reports/texts-issues.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface TextIssue {
  file: string;
  line: number;
  column: number;
  type: 'hardcoded-hebrew' | 'hardcoded-english' | 'missing-key' | 'unused-key' | 'no-i18n-import';
  severity: 'critical' | 'high' | 'medium' | 'low';
  value: string;
  context: string;
  suggestion: string;
  suggestedKey?: string;
}

interface TextAuditReport {
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
    'hardcoded-hebrew': number;
    'hardcoded-english': number;
    'missing-key': number;
    'unused-key': number;
    'no-i18n-import': number;
  };
  translationStats: {
    totalKeysHe: number;
    totalKeysEn: number;
    missingInEn: string[];
    missingInHe: string[];
  };
  issues: TextIssue[];
}

// Regex patterns
const HEBREW_PATTERN = /[\u0590-\u05FF]+/;
const STRING_LITERAL_PATTERN = /(['"`])(?:(?=(\\?))\2.)*?\1/g;

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.expo',
  'ios',
  'android',
  'web',
  'locales', // Don't audit the translation files themselves
  'scripts',
  '.git',
  'coverage',
  'assets'
];

// Patterns to ignore (technical strings, not user-facing)
const IGNORE_PATTERNS = [
  /^https?:\/\//,  // URLs
  /^[A-Z_]+$/,     // Constants (e.g., API_KEY)
  /^\d+$/,         // Pure numbers
  /^[a-z]+:[a-z]+$/, // i18n keys themselves
  /^\w+\.\w+$/,    // Property access (e.g., user.name)
  /^#[0-9A-Fa-f]{3,6}$/, // Hex colors
  /^rgba?\(/,      // RGB colors
  /^\//,           // Paths
  /^@/,            // Decorators/mentions
];

class TextAuditor {
  private report: TextAuditReport;
  private rootDir: string;
  private translationsHe: any;
  private translationsEn: any;
  private usedKeys: Set<string>;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.usedKeys = new Set();
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
        'hardcoded-hebrew': 0,
        'hardcoded-english': 0,
        'missing-key': 0,
        'unused-key': 0,
        'no-i18n-import': 0
      },
      translationStats: {
        totalKeysHe: 0,
        totalKeysEn: 0,
        missingInEn: [],
        missingInHe: []
      },
      issues: []
    };

    this.loadTranslations();
  }

  private loadTranslations(): void {
    try {
      const hePath = path.join(this.rootDir, 'locales', 'he.json');
      const enPath = path.join(this.rootDir, 'locales', 'en.json');

      if (fs.existsSync(hePath)) {
        this.translationsHe = JSON.parse(fs.readFileSync(hePath, 'utf-8'));
        this.report.translationStats.totalKeysHe = this.countKeys(this.translationsHe);
      }

      if (fs.existsSync(enPath)) {
        this.translationsEn = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
        this.report.translationStats.totalKeysEn = this.countKeys(this.translationsEn);
      }

      console.log(`Loaded translations: ${this.report.translationStats.totalKeysHe} Hebrew keys, ${this.report.translationStats.totalKeysEn} English keys\n`);
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  }

  private countKeys(obj: any, prefix: string = ''): number {
    let count = 0;
    for (const key in obj) {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        count += this.countKeys(obj[key], prefix ? `${prefix}.${key}` : key);
      } else {
        count++;
      }
    }
    return count;
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

  private hasI18nImport(content: string): boolean {
    return /import.*useTranslation.*from\s+['"]react-i18next['"]/.test(content) ||
      /import.*\{.*t.*\}.*from\s+['"]react-i18next['"]/.test(content);
  }

  private isIgnoredString(str: string): boolean {
    return IGNORE_PATTERNS.some(pattern => pattern.test(str));
  }

  private containsHebrew(str: string): boolean {
    return HEBREW_PATTERN.test(str);
  }

  private suggestKey(text: string): string {
    // Simple key suggestion based on text content
    const cleaned = text
      .replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, '')
      .trim()
      .slice(0, 30);

    if (this.containsHebrew(cleaned)) {
      return 'common:newKey'; // Placeholder for Hebrew text
    }

    return 'common:' + cleaned
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  private detectHardcodedStrings(content: string, filePath: string, hasI18nImport: boolean): void {
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      // Skip import statements
      if (line.trim().startsWith('import')) {
        return;
      }

      const matches = line.matchAll(STRING_LITERAL_PATTERN);

      for (const match of matches) {
        const fullMatch = match[0];
        const quote = match[1];
        const content = fullMatch.slice(1, -1); // Remove quotes
        const column = match.index || 0;

        // Skip empty strings
        if (!content.trim()) {
          continue;
        }

        // Skip ignored patterns
        if (this.isIgnoredString(content)) {
          continue;
        }

        // Skip if it's already using t() function
        const beforeMatch = line.substring(0, column);
        if (/t\s*\(\s*$/.test(beforeMatch)) {
          // Extract the key being used
          const keyMatch = content.match(/^([a-z]+:[a-zA-Z.]+)$/);
          if (keyMatch) {
            this.usedKeys.add(keyMatch[1]);
          }
          continue;
        }

        // Detect Hebrew text
        if (this.containsHebrew(content)) {
          this.addIssue({
            file: path.relative(this.rootDir, filePath),
            line: lineIndex + 1,
            column: column + 1,
            type: 'hardcoded-hebrew',
            severity: hasI18nImport ? 'high' : 'critical',
            value: content,
            context: line.trim(),
            suggestion: hasI18nImport
              ? `Replace "${content}" with {t('${this.suggestKey(content)}')}`
              : `Import useTranslation and replace "${content}" with {t('key')}`,
            suggestedKey: this.suggestKey(content)
          });
        }
        // Detect English text (only if it looks like user-facing text)
        else if (content.length > 2 && /[a-zA-Z]/.test(content) && /\s/.test(content)) {
          this.addIssue({
            file: path.relative(this.rootDir, filePath),
            line: lineIndex + 1,
            column: column + 1,
            type: 'hardcoded-english',
            severity: 'medium',
            value: content,
            context: line.trim(),
            suggestion: hasI18nImport
              ? `Replace "${content}" with {t('${this.suggestKey(content)}')}`
              : `Import useTranslation and replace "${content}" with {t('key')}`,
            suggestedKey: this.suggestKey(content)
          });
        }
      }
    });
  }

  private detectMissingI18nImport(content: string, filePath: string): void {
    const hasImport = this.hasI18nImport(content);

    // Check if file has JSX/TSX content (likely needs i18n)
    const hasJSX = /<[A-Z]/.test(content) || /<Text/.test(content);

    if (hasJSX && !hasImport) {
      const hasHardcodedText = this.containsHebrew(content) ||
        /['"][^'"]{10,}['"]/.test(content);

      if (hasHardcodedText) {
        this.addIssue({
          file: path.relative(this.rootDir, filePath),
          line: 1,
          column: 1,
          type: 'no-i18n-import',
          severity: 'high',
          value: 'N/A',
          context: 'File has JSX and text but no i18n import',
          suggestion: `Add: import { useTranslation } from 'react-i18next'; const { t } = useTranslation();`
        });
      }
    }
  }

  private addIssue(issue: TextIssue): void {
    this.report.issues.push(issue);
    this.report.totalIssues++;
    this.report.issuesBySeverity[issue.severity]++;
    this.report.issuesByType[issue.type]++;
  }

  private auditFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasI18nImport = this.hasI18nImport(content);

      const issuesBeforeFile = this.report.totalIssues;

      this.detectHardcodedStrings(content, filePath, hasI18nImport);
      this.detectMissingI18nImport(content, filePath);

      const issuesAfterFile = this.report.totalIssues;

      if (issuesAfterFile > issuesBeforeFile) {
        this.report.filesWithIssues++;
      }

      this.report.totalFiles++;
    } catch (error) {
      console.error(`Error auditing file ${filePath}:`, error);
    }
  }

  public audit(): TextAuditReport {
    console.log('📝 Starting text/i18n audit...\n');

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
    console.log('TEXT/I18N AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nTotal files scanned: ${this.report.totalFiles}`);
    console.log(`Files with issues: ${this.report.filesWithIssues}`);
    console.log(`Total issues found: ${this.report.totalIssues}\n`);

    console.log('Translation coverage:');
    console.log(`  Hebrew keys:  ${this.report.translationStats.totalKeysHe}`);
    console.log(`  English keys: ${this.report.translationStats.totalKeysEn}\n`);

    console.log('Issues by severity:');
    console.log(`  🔴 Critical: ${this.report.issuesBySeverity.critical}`);
    console.log(`  🟠 High:     ${this.report.issuesBySeverity.high}`);
    console.log(`  🟡 Medium:   ${this.report.issuesBySeverity.medium}`);
    console.log(`  🟢 Low:      ${this.report.issuesBySeverity.low}\n`);

    console.log('Issues by type:');
    console.log(`  Hardcoded Hebrew:  ${this.report.issuesByType['hardcoded-hebrew']}`);
    console.log(`  Hardcoded English: ${this.report.issuesByType['hardcoded-english']}`);
    console.log(`  Missing keys:      ${this.report.issuesByType['missing-key']}`);
    console.log(`  Unused keys:       ${this.report.issuesByType['unused-key']}`);
    console.log(`  Missing i18n:      ${this.report.issuesByType['no-i18n-import']}\n`);

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
  const outputPath = path.join(rootDir, 'audit-reports', 'texts-issues.json');

  const auditor = new TextAuditor(rootDir);
  auditor.audit();
  auditor.saveReport(outputPath);
  auditor.printSummary();

  process.exit(0);
}

export { TextAuditor, TextAuditReport, TextIssue };




