#!/usr/bin/env ts-node
/**
 * Master Audit Script
 * Purpose: Runs all audit scripts and generates a comprehensive summary report
 *
 * Runs:
 * 1. audit-colors.ts
 * 2. audit-texts.ts
 * 3. audit-constants.ts
 * 4. audit-responsive.ts
 * 5. find-unused-files.ts
 * 6. audit-structure.ts
 *
 * Output: audit-reports/summary.md, master-report.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ColorAuditor, ColorAuditReport } from './audit-colors';
import { TextAuditor, TextAuditReport } from './audit-texts';
import { ConstantAuditor, ConstantAuditReport } from './audit-constants';
import { ResponsiveAuditor, ResponsiveAuditReport } from './audit-responsive';
import { UnusedFileFinder, UnusedFilesReport } from './find-unused-files';
import { StructureAuditor, StructureReport } from './audit-structure';

interface MasterReport {
  timestamp: string;
  colors: ColorAuditReport;
  texts: TextAuditReport;
  constants: ConstantAuditReport;
  responsive: ResponsiveAuditReport;
  unusedFiles: UnusedFilesReport;
  structure: StructureReport;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    filesScanned: number;
    /** Distinct relative file paths that appear in at least one audit's issues list */
    filesWithIssues: number;
  };
}

type SeverityBucket = 'critical' | 'high' | 'medium' | 'low';

function emptySeverityCounts(): Record<SeverityBucket, number> {
  return { critical: 0, high: 0, medium: 0, low: 0 };
}

function addSeverityCounts(
  target: Record<SeverityBucket, number>,
  source: Record<SeverityBucket, number>
): void {
  (Object.keys(target) as SeverityBucket[]).forEach(k => {
    target[k] += source[k];
  });
}

class MasterAuditor {
  private readonly rootDir: string;
  private readonly reportsDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.reportsDir = path.join(rootDir, 'audit-reports');

    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  private printHeader(title: string): void {
    console.info('\n' + '='.repeat(70));
    console.info(title.toUpperCase().padStart((70 + title.length) / 2));
    console.info('='.repeat(70) + '\n');
  }

  /**
   * Union of file paths across audits (one file can have issues in multiple categories).
   */
  private countUniqueFilesWithIssues(
    colors: ColorAuditReport,
    texts: TextAuditReport,
    constants: ConstantAuditReport,
    responsive: ResponsiveAuditReport,
    unused: UnusedFilesReport,
    structure: StructureReport
  ): number {
    const paths = new Set<string>();
    const collect = (issues: readonly { file: string }[]): void => {
      for (const issue of issues) {
        if (issue.file) {
          paths.add(issue.file.replaceAll('\\', '/'));
        }
      }
    };
    collect(colors.issues);
    collect(texts.issues);
    collect(constants.issues);
    collect(responsive.issues);
    collect(unused.issues);
    collect(structure.issues);
    return paths.size;
  }

  public async runAllAudits(): Promise<MasterReport> {
    const stepTotal = 6;
    console.info('\n🚀 Starting comprehensive codebase audit...\n');
    console.info('This will scan all TypeScript/TSX files for:');
    console.info('  • Hardcoded colors');
    console.info('  • Hardcoded texts (i18n issues)');
    console.info('  • Magic numbers and constants');
    console.info('  • Responsive design issues');
    console.info('  • Unused / duplicate files');
    console.info('  • Project structure & naming\n');
    console.info('This may take a few minutes...\n');

    // Run all audits
    this.printHeader(`1/${stepTotal}: Colors Audit`);
    const colorAuditor = new ColorAuditor(this.rootDir);
    const colorsReport = colorAuditor.audit();
    colorAuditor.saveReport(path.join(this.reportsDir, 'colors-issues.json'));
    colorAuditor.printSummary();

    this.printHeader(`2/${stepTotal}: Texts/i18n Audit`);
    const textAuditor = new TextAuditor(this.rootDir);
    const textsReport = textAuditor.audit();
    textAuditor.saveReport(path.join(this.reportsDir, 'texts-issues.json'));
    textAuditor.printSummary();

    this.printHeader(`3/${stepTotal}: Constants Audit`);
    const constantAuditor = new ConstantAuditor(this.rootDir);
    const constantsReport = constantAuditor.audit();
    constantAuditor.saveReport(path.join(this.reportsDir, 'constants-issues.json'));
    constantAuditor.printSummary();

    this.printHeader(`4/${stepTotal}: Responsive Design Audit`);
    const responsiveAuditor = new ResponsiveAuditor(this.rootDir);
    const responsiveReport = responsiveAuditor.audit();
    responsiveAuditor.saveReport(path.join(this.reportsDir, 'responsive-issues.json'));
    responsiveAuditor.printSummary();

    this.printHeader(`5/${stepTotal}: Unused Files Audit`);
    const unusedFinder = new UnusedFileFinder(this.rootDir);
    const unusedReport = unusedFinder.audit();
    unusedFinder.saveReport(path.join(this.reportsDir, 'unused-files.json'));
    unusedFinder.printSummary();

    this.printHeader(`6/${stepTotal}: Structure Audit`);
    const structureAuditor = new StructureAuditor(this.rootDir);
    const structureReport = structureAuditor.audit();
    structureAuditor.saveReport(path.join(this.reportsDir, 'structure-issues.json'));
    structureAuditor.printSummary();

    const unusedSeverity = emptySeverityCounts();
    for (const issue of unusedReport.issues) {
      unusedSeverity[issue.severity]++;
    }

    const structureSeverity = emptySeverityCounts();
    for (const issue of structureReport.issues) {
      structureSeverity[issue.severity]++;
    }

    const severityTotals = emptySeverityCounts();
    addSeverityCounts(severityTotals, colorsReport.issuesBySeverity);
    addSeverityCounts(severityTotals, textsReport.issuesBySeverity);
    addSeverityCounts(severityTotals, constantsReport.issuesBySeverity);
    addSeverityCounts(severityTotals, responsiveReport.issuesBySeverity);
    addSeverityCounts(severityTotals, unusedSeverity);
    addSeverityCounts(severityTotals, structureSeverity);

    const totalIssues =
      colorsReport.totalIssues +
      textsReport.totalIssues +
      constantsReport.totalIssues +
      responsiveReport.totalIssues +
      unusedReport.issues.length +
      structureReport.totalIssues;

    const severitySum =
      severityTotals.critical +
      severityTotals.high +
      severityTotals.medium +
      severityTotals.low;

    if (severitySum !== totalIssues) {
      console.warn(
        `\n⚠️  Master audit: severity totals (${severitySum}) != totalIssues (${totalIssues}). ` +
          'Sub-audits may classify counts differently; totals above are authoritative.\n'
      );
    }

    // Create master report
    const masterReport: MasterReport = {
      timestamp: new Date().toISOString(),
      colors: colorsReport,
      texts: textsReport,
      constants: constantsReport,
      responsive: responsiveReport,
      unusedFiles: unusedReport,
      structure: structureReport,
      summary: {
        totalIssues,
        criticalIssues: severityTotals.critical,
        highIssues: severityTotals.high,
        mediumIssues: severityTotals.medium,
        lowIssues: severityTotals.low,
        filesScanned: Math.max(
          colorsReport.totalFiles,
          textsReport.totalFiles,
          constantsReport.totalFiles,
          responsiveReport.totalFiles,
          unusedReport.totalFiles,
          structureReport.totalFilesScanned
        ),
        filesWithIssues: this.countUniqueFilesWithIssues(
          colorsReport,
          textsReport,
          constantsReport,
          responsiveReport,
          unusedReport,
          structureReport
        )
      }
    };

    return masterReport;
  }

  private generateMarkdownSummary(report: MasterReport): string {
    const total = report.summary.totalIssues;
    const pct = (n: number): string =>
      total === 0 ? '0.0' : ((n / total) * 100).toFixed(1);
    const spaceMB = (report.unusedFiles.potentialSpaceSaved / 1024 / 1024).toFixed(2);

    const criticalPriorityLines =
      report.summary.criticalIssues > 0
        ? [
            `1. Fix ${report.summary.criticalIssues} critical issues`,
            '   - Focus on missing imports and hardcoded values in production code\n'
          ]
        : ['✅ No critical issues found!\n'];

    const md: string[] = [
      '# Codebase Audit Summary\n',
      `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`,
      '---\n',
      '## 📊 Overall Summary\n',
      `- **Total Files Scanned:** ${report.summary.filesScanned} (max across audits; unused/structure may scan a wider file set)`,
      `- **Distinct Files With ≥1 Issue:** ${report.summary.filesWithIssues} (union of issue file paths across all audits)`,
      `- **Total Issues Found:** ${report.summary.totalIssues}\n`,
      '### Issues by Severity\n',
      '| Severity | Count | Percentage |',
      '|----------|-------|------------|',
      `| 🔴 Critical | ${report.summary.criticalIssues} | ${pct(report.summary.criticalIssues)}% |`,
      `| 🟠 High | ${report.summary.highIssues} | ${pct(report.summary.highIssues)}% |`,
      `| 🟡 Medium | ${report.summary.mediumIssues} | ${pct(report.summary.mediumIssues)}% |`,
      `| 🟢 Low | ${report.summary.lowIssues} | ${pct(report.summary.lowIssues)}% |\n`,
      '## 🎨 Colors Audit\n',
      `- **Total Issues:** ${report.colors.totalIssues}`,
      `- **Files Affected:** ${report.colors.filesWithIssues}`,
      `- **Hex Colors:** ${report.colors.issuesByType.hex}`,
      `- **RGB Colors:** ${report.colors.issuesByType.rgb}`,
      `- **Named Colors:** ${report.colors.issuesByType.named}`,
      `- **Missing Imports:** ${report.colors.issuesByType['missing-import']}\n`,
      '**Action Required:** Replace all hardcoded colors with imports from `globals/colors.tsx`\n',
      '## 📝 Texts/i18n Audit\n',
      `- **Total Issues:** ${report.texts.totalIssues}`,
      `- **Files Affected:** ${report.texts.filesWithIssues}`,
      `- **Hardcoded Hebrew:** ${report.texts.issuesByType['hardcoded-hebrew']}`,
      `- **Hardcoded English:** ${report.texts.issuesByType['hardcoded-english']}`,
      `- **Missing i18n Import:** ${report.texts.issuesByType['no-i18n-import']}`,
      `- **Translation Keys (HE):** ${report.texts.translationStats.totalKeysHe}`,
      `- **Translation Keys (EN):** ${report.texts.translationStats.totalKeysEn}\n`,
      '**Action Required:** Replace all hardcoded text with `t()` function and add missing keys to `locales/*.json`\n',
      '## 🔢 Constants Audit\n',
      `- **Total Issues:** ${report.constants.totalIssues}`,
      `- **Files Affected:** ${report.constants.filesWithIssues}`,
      `- **Hardcoded Sizes:** ${report.constants.issuesByType['hardcoded-size']}`,
      `- **Repeated Values:** ${report.constants.issuesByType['repeated-value']}`,
      `- **Magic Numbers:** ${report.constants.issuesByType['magic-number']}`,
      `- **Missing Imports:** ${report.constants.issuesByType['missing-import']}\n`,
      '**Action Required:** Replace magic numbers with constants from `globals/constants.tsx`\n',
      '## 📱 Responsive Design Audit\n',
      `- **Total Issues:** ${report.responsive.totalIssues}`,
      `- **Files Affected:** ${report.responsive.filesWithIssues}`,
      `- **Direct Dimensions:** ${report.responsive.issuesByType['dimensions-direct']}`,
      `- **No Responsive Functions:** ${report.responsive.issuesByType['no-responsive-function']}`,
      `- **No Screen Size Checks:** ${report.responsive.issuesByType['no-screen-size-check']}`,
      `- **No Platform Checks:** ${report.responsive.issuesByType['no-platform-check']}`,
      `- **Missing Imports:** ${report.responsive.issuesByType['missing-import']}\n`,
      '**Action Required:** Use responsive functions from `globals/responsive.ts` for all layouts\n',
      '## 🗑️ Unused Files Audit\n',
      `- **Unused Files:** ${report.unusedFiles.unusedFiles}`,
      `- **Duplicate Files:** ${report.unusedFiles.duplicateFiles}`,
      `- **Old/Backup Files:** ${report.unusedFiles.oldBackupFiles}`,
      `- **Potential Space to Reclaim:** ${spaceMB} MB\n`,
      '**Action Required:** Review and remove unused/duplicate files\n',
      '## 🏗️ Structure Audit\n',
      `- **Total Issues:** ${report.structure.totalIssues}\n`,
      '**Action Required:** specific file naming and placement corrections\n',
      '## 🎯 Priority Actions\n',
      '### Critical (Fix Immediately)\n',
      ...criticalPriorityLines,
      '### High Priority (Fix Soon)\n',
      `1. Colors: Replace ${report.colors.issuesByType.hex + report.colors.issuesByType.rgb} hardcoded colors`,
      `2. Texts: Replace ${report.texts.issuesByType['hardcoded-hebrew']} hardcoded Hebrew texts`,
      `3. Responsive: Fix ${report.responsive.issuesByType['no-responsive-function']} non-responsive styles\n`,
      '### Medium Priority (Plan to Fix)\n',
      `1. Constants: Extract ${report.constants.issuesByType['repeated-value']} repeated values`,
      `2. Texts: Replace ${report.texts.issuesByType['hardcoded-english']} hardcoded English texts`,
      `3. Cleanup: Remove ${report.unusedFiles.unusedFiles} unused files\n`,
      '## 📋 Next Steps\n',
      '1. Review detailed reports in `audit-reports/` directory',
      '2. Create a plan for fixing issues by priority',
      '3. Fix critical and high-priority issues first',
      '4. Run audits again after fixes to verify improvements',
      '5. Set up pre-commit hooks to prevent new issues\n',
      '## 📁 Detailed Reports\n',
      '- `colors-issues.json` - All color-related issues',
      '- `texts-issues.json` - All text/i18n issues',
      '- `constants-issues.json` - All constants issues',
      '- `responsive-issues.json` - All responsive design issues',
      '- `unused-files.json` - All unused/duplicate files',
      '- `structure-issues.json` - Structural organization issues\n'
    ];

    return md.join('\n');
  }

  public saveMasterReport(report: MasterReport): void {
    // Save JSON report
    const jsonPath = path.join(this.reportsDir, 'master-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Save Markdown summary
    const mdPath = path.join(this.reportsDir, 'summary.md');
    const markdown = this.generateMarkdownSummary(report);
    fs.writeFileSync(mdPath, markdown);

    console.info('\n📊 Master reports saved:');
    console.info(`   - ${jsonPath}`);
    console.info(`   - ${mdPath}\n`);
  }

  public printFinalSummary(report: MasterReport): void {
    console.info('\n' + '='.repeat(70));
    console.info('FINAL AUDIT SUMMARY'.padStart(45));
    console.info('='.repeat(70) + '\n');

    console.info(`📁 Files scanned (max across audits): ${report.summary.filesScanned}`);
    console.info(`⚠️  Distinct files with ≥1 issue: ${report.summary.filesWithIssues}`);
    console.info(`🔍 Total issues found: ${report.summary.totalIssues}\n`);

    console.info('Issues breakdown:');
    console.info(`  🔴 Critical: ${report.summary.criticalIssues}`);
    console.info(`  🟠 High:     ${report.summary.highIssues}`);
    console.info(`  🟡 Medium:   ${report.summary.mediumIssues}`);
    console.info(`  🟢 Low:      ${report.summary.lowIssues}\n`);

    console.info('By category:');
    console.info(`  🎨 Colors:     ${report.colors.totalIssues} issues`);
    console.info(`  📝 Texts:      ${report.texts.totalIssues} issues`);
    console.info(`  🔢 Constants:  ${report.constants.totalIssues} issues`);
    console.info(`  📱 Responsive: ${report.responsive.totalIssues} issues`);
    console.info(`  🗑️  Unused:     ${report.unusedFiles.issues.length} files`);
    console.info(`  🏗️  Structure:  ${report.structure.totalIssues} issues\n`);

    console.info('📊 Detailed reports saved in: audit-reports/');
    console.info('📄 Read summary.md for action plan\n');

    console.info('='.repeat(70) + '\n');
  }
}

// Main execution
if (require.main === module) {
  const rootDir = path.join(__dirname, '..');
  const auditor = new MasterAuditor(rootDir);

  auditor.runAllAudits()
    .then(report => {
      auditor.saveMasterReport(report);
      auditor.printFinalSummary(report);

      // Exit with error code if any issues were found
      if (report.summary.totalIssues > 0) {
        console.error(`\n❌ Audit failed with ${report.summary.totalIssues} issues.\n`);
        process.exit(1);
      }

      console.info('\n✅ Audit passed! No issues found.\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error running audits:', error);
      process.exit(1);
    });
}

export { MasterAuditor, MasterReport };

