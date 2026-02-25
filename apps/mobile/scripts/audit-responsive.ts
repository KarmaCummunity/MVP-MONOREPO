#!/usr/bin/env ts-node
/**
 * Audit Script: Responsive Design
 * 
 * Purpose: Scans all TypeScript/TSX files to detect responsive design issues
 * and ensure proper use of responsive utilities from globals/responsive.ts
 * 
 * Detects:
 * - Direct use of Dimensions.get() instead of getScreenInfo()
 * - Missing Platform.OS checks for platform-specific code
 * - Hardcoded sizes without scaleSize() or responsive functions
 * - Missing responsive imports
 * - Styles without mobile/tablet/desktop considerations
 * 
 * Output: audit-reports/responsive-issues.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface ResponsiveIssue {
  file: string;
  line: number;
  column: number;
  type: 'dimensions-direct' | 'no-platform-check' | 'no-responsive-function' | 'missing-import' | 'no-screen-size-check';
  severity: 'critical' | 'high' | 'medium' | 'low';
  value: string;
  context: string;
  suggestion: string;
}

interface ResponsiveAuditReport {
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
    'dimensions-direct': number;
    'no-platform-check': number;
    'no-responsive-function': number;
    'missing-import': number;
    'no-screen-size-check': number;
  };
  issues: ResponsiveIssue[];
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
  'globals/responsive.ts', // Don't audit the responsive file itself
  'scripts',
  '.git',
  'coverage'
];

// Responsive functions that should be used
const RESPONSIVE_FUNCTIONS = [
  'getScreenInfo',
  'scaleSize',
  'responsiveSpacing',
  'responsiveFontSize',
  'responsiveWidth',
  'responsivePadding',
  'getResponsiveButtonStyles',
  'getResponsiveContainerStyles',
  'getResponsiveModalStyles',
  'getResponsiveMenuStyles',
  'biDiTextAlign',
  'rowDirection'
];

// Platform-specific patterns
const PLATFORM_SPECIFIC_APIS = [
  'StatusBar',
  'SafeAreaView',
  'KeyboardAvoidingView',
  'TouchableNativeFeedback',
  'PermissionsAndroid'
];

class ResponsiveAuditor {
  private report: ResponsiveAuditReport;
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
        'dimensions-direct': 0,
        'no-platform-check': 0,
        'no-responsive-function': 0,
        'missing-import': 0,
        'no-screen-size-check': 0
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

  private hasResponsiveImport(content: string): boolean {
    return /import.*from\s+['"].*globals\/responsive['"]/.test(content);
  }

  private detectDirectDimensions(content: string, filePath: string): void {
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      // Look for Dimensions.get()
      const dimensionsPattern = /Dimensions\.get\(['"](?:window|screen)['"]\)/g;
      const matches = line.matchAll(dimensionsPattern);

      for (const match of matches) {
        const column = match.index || 0;

        this.addIssue({
          file: path.relative(this.rootDir, filePath),
          line: lineIndex + 1,
          column: column + 1,
          type: 'dimensions-direct',
          severity: 'high',
          value: match[0],
          context: line.trim(),
          suggestion: `Replace ${match[0]} with getScreenInfo() from globals/responsive.ts`
        });
      }
    });
  }

  private detectMissingPlatformChecks(content: string, filePath: string): void {
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Skip comments and imports
      if (line.trim().startsWith('//') ||
        line.trim().startsWith('*') ||
        line.trim().startsWith('import')) {
        return;
      }

      // Check for platform-specific APIs without Platform.OS check
      PLATFORM_SPECIFIC_APIS.forEach(api => {
        if (line.includes(api)) {
          // Check if there's a Platform.OS check nearby (within 5 lines)
          const contextLines = lines.slice(
            Math.max(0, lineIndex - 5),
            Math.min(lines.length, lineIndex + 5)
          );
          const hasPlatformCheck = contextLines.some(l =>
            /Platform\.OS|Platform\.select/.test(l)
          );

          if (!hasPlatformCheck) {
            this.addIssue({
              file: path.relative(this.rootDir, filePath),
              line: lineIndex + 1,
              column: 1,
              type: 'no-platform-check',
              severity: 'medium',
              value: api,
              context: line.trim(),
              suggestion: `Consider adding Platform.OS check for ${api} usage`
            });
          }
        }
      });
    });
  }

  private detectMissingResponsiveFunctions(content: string, filePath: string, hasImport: boolean): void {
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      // Check for StyleSheet.create with hardcoded values
      if (line.includes('StyleSheet.create')) {
        // Look ahead for style definitions
        const styleBlockStart = lineIndex;
        let styleBlockEnd = lineIndex;

        // Find the end of the style block (simplified)
        for (let i = lineIndex + 1; i < Math.min(lines.length, lineIndex + 50); i++) {
          if (lines[i].includes('});')) {
            styleBlockEnd = i;
            break;
          }
        }

        // Check if the style block uses responsive functions
        const styleBlock = lines.slice(styleBlockStart, styleBlockEnd + 1).join('\n');
        const hasResponsiveFunctions = RESPONSIVE_FUNCTIONS.some(fn =>
          styleBlock.includes(fn)
        );

        // Check if it has numeric values that should be responsive
        const hasNumericValues = /:\s*\d+/.test(styleBlock);

        if (hasNumericValues && !hasResponsiveFunctions) {
          this.addIssue({
            file: path.relative(this.rootDir, filePath),
            line: lineIndex + 1,
            column: 1,
            type: 'no-responsive-function',
            severity: hasImport ? 'medium' : 'high',
            value: 'StyleSheet',
            context: 'StyleSheet with hardcoded values',
            suggestion: hasImport
              ? `Use responsive functions like scaleSize(), responsiveSpacing(), or responsiveFontSize()`
              : `Import responsive utilities and use functions like scaleSize(), responsiveSpacing()`
          });
        }
      }
    });
  }

  private detectMissingScreenSizeChecks(content: string, filePath: string): void {
    const lines = content.split('\n');

    // Check if file has JSX (component file)
    const hasJSX = /<[A-Z]/.test(content) || /<View/.test(content);

    if (!hasJSX) {
      return; // Skip non-component files
    }

    // Check if file uses screen size checks
    const hasScreenSizeCheck = /isTablet|isDesktop|isLargeDesktop|isMobile|isWeb|getScreenInfo/.test(content);

    // Check if file has complex layouts that would benefit from responsive design
    const hasComplexLayout = /flex|width|height|padding|margin/.test(content);

    if (hasComplexLayout && !hasScreenSizeCheck) {
      this.addIssue({
        file: path.relative(this.rootDir, filePath),
        line: 1,
        column: 1,
        type: 'no-screen-size-check',
        severity: 'medium',
        value: 'N/A',
        context: 'Component with layout but no screen size checks',
        suggestion: `Consider using getScreenInfo() to adapt layout for different screen sizes (mobile/tablet/desktop)`
      });
    }
  }

  private detectMissingImport(content: string, filePath: string): void {
    const hasImport = this.hasResponsiveImport(content);

    // Check if file has styles
    const hasStyles = /StyleSheet\.create|fontSize|padding|margin|width|height/.test(content);

    // Check if file uses any responsive functions
    const usesResponsiveFunctions = RESPONSIVE_FUNCTIONS.some(fn =>
      content.includes(fn)
    );

    if (hasStyles && !hasImport && !usesResponsiveFunctions) {
      this.addIssue({
        file: path.relative(this.rootDir, filePath),
        line: 1,
        column: 1,
        type: 'missing-import',
        severity: 'medium',
        value: 'N/A',
        context: 'File uses styles but does not import from globals/responsive.ts',
        suggestion: `Add: import { getScreenInfo, scaleSize, responsiveSpacing } from '../globals/responsive';`
      });
    }
  }

  private addIssue(issue: ResponsiveIssue): void {
    this.report.issues.push(issue);
    this.report.totalIssues++;
    this.report.issuesBySeverity[issue.severity]++;
    this.report.issuesByType[issue.type]++;
  }

  private auditFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasImport = this.hasResponsiveImport(content);

      const issuesBeforeFile = this.report.totalIssues;

      this.detectDirectDimensions(content, filePath);
      this.detectMissingPlatformChecks(content, filePath);
      this.detectMissingResponsiveFunctions(content, filePath, hasImport);
      this.detectMissingScreenSizeChecks(content, filePath);
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

  public audit(): ResponsiveAuditReport {
    console.log('📱 Starting responsive design audit...\n');

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
    console.log('RESPONSIVE DESIGN AUDIT SUMMARY');
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
    console.log(`  Direct Dimensions:        ${this.report.issuesByType['dimensions-direct']}`);
    console.log(`  No Platform check:        ${this.report.issuesByType['no-platform-check']}`);
    console.log(`  No responsive functions:  ${this.report.issuesByType['no-responsive-function']}`);
    console.log(`  No screen size checks:    ${this.report.issuesByType['no-screen-size-check']}`);
    console.log(`  Missing imports:          ${this.report.issuesByType['missing-import']}\n`);

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
  const outputPath = path.join(rootDir, 'audit-reports', 'responsive-issues.json');

  const auditor = new ResponsiveAuditor(rootDir);
  auditor.audit();
  auditor.saveReport(outputPath);
  auditor.printSummary();

  process.exit(0);
}

export { ResponsiveAuditor, ResponsiveAuditReport, ResponsiveIssue };




