#!/usr/bin/env ts-node
/**
 * Master Audit Script
 * 
 * Purpose: Runs all audit scripts and generates a comprehensive summary report
 * 
 * Runs:
 * 1. audit-colors.ts
 * 2. audit-texts.ts
 * 3. audit-constants.ts
 * 4. audit-responsive.ts
 * 5. find-unused-files.ts
 * 
 * Output: audit-reports/summary.md (comprehensive summary)
 */

import * as fs from 'fs';
import * as path from 'path';
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
    filesWithIssues: number;
  };
}

class MasterAuditor {
  private rootDir: string;
  private reportsDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.reportsDir = path.join(rootDir, 'audit-reports');

    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  private printHeader(title: string): void {
    console.log('\n' + '='.repeat(70));
    console.log(title.toUpperCase().padStart((70 + title.length) / 2));
    console.log('='.repeat(70) + '\n');
  }

  public async runAllAudits(): Promise<MasterReport> {
    console.log('\n🚀 Starting comprehensive codebase audit...\n');
    console.log('This will scan all TypeScript/TSX files for:');
    console.log('  • Hardcoded colors');
    console.log('  • Hardcoded texts (i18n issues)');
    console.log('  • Magic numbers and constants');
    console.log('  • Responsive design issues');
    console.log('  • Unused files\n');
    console.log('This may take a few minutes...\n');

    // Run all audits
    this.printHeader('1/5: Colors Audit');
    const colorAuditor = new ColorAuditor(this.rootDir);
    const colorsReport = colorAuditor.audit();
    colorAuditor.saveReport(path.join(this.reportsDir, 'colors-issues.json'));
    colorAuditor.printSummary();

    this.printHeader('2/5: Texts/i18n Audit');
    const textAuditor = new TextAuditor(this.rootDir);
    const textsReport = textAuditor.audit();
    textAuditor.saveReport(path.join(this.reportsDir, 'texts-issues.json'));
    textAuditor.printSummary();

    this.printHeader('3/5: Constants Audit');
    const constantAuditor = new ConstantAuditor(this.rootDir);
    const constantsReport = constantAuditor.audit();
    constantAuditor.saveReport(path.join(this.reportsDir, 'constants-issues.json'));
    constantAuditor.printSummary();

    this.printHeader('4/5: Responsive Design Audit');
    const responsiveAuditor = new ResponsiveAuditor(this.rootDir);
    const responsiveReport = responsiveAuditor.audit();
    responsiveAuditor.saveReport(path.join(this.reportsDir, 'responsive-issues.json'));
    responsiveAuditor.printSummary();

    this.printHeader('5/5: Unused Files Audit');
    const unusedFinder = new UnusedFileFinder(this.rootDir);
    const unusedReport = unusedFinder.audit();
    unusedFinder.saveReport(path.join(this.reportsDir, 'unused-files.json'));
    unusedFinder.printSummary();

    this.printHeader('6/6: Structure Audit');
    const structureAuditor = new StructureAuditor(this.rootDir);
    const structureReport = structureAuditor.audit();
    structureAuditor.saveReport(path.join(this.reportsDir, 'structure-issues.json'));
    structureAuditor.printSummary();

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
        totalIssues:
          colorsReport.totalIssues +
          textsReport.totalIssues +
          constantsReport.totalIssues +
          responsiveReport.totalIssues +
          constantsReport.totalIssues +
          responsiveReport.totalIssues +
          unusedReport.issues.length +
          structureReport.totalIssues,
        criticalIssues:
          colorsReport.issuesBySeverity.critical +
          textsReport.issuesBySeverity.critical +
          constantsReport.issuesBySeverity.critical +
          responsiveReport.issuesBySeverity.critical,
        highIssues:
          colorsReport.issuesBySeverity.high +
          textsReport.issuesBySeverity.high +
          constantsReport.issuesBySeverity.high +
          responsiveReport.issuesBySeverity.high,
        mediumIssues:
          colorsReport.issuesBySeverity.medium +
          textsReport.issuesBySeverity.medium +
          constantsReport.issuesBySeverity.medium +
          responsiveReport.issuesBySeverity.medium,
        lowIssues:
          colorsReport.issuesBySeverity.low +
          textsReport.issuesBySeverity.low +
          constantsReport.issuesBySeverity.low +
          responsiveReport.issuesBySeverity.low,
        filesScanned: colorsReport.totalFiles,
        filesWithIssues: Math.max(
          colorsReport.filesWithIssues,
          textsReport.filesWithIssues,
          constantsReport.filesWithIssues,
          responsiveReport.filesWithIssues,
          // Structure report doesn't count "files with issues" property directly in same way, 
          // but we can approximate or ignore for max simple calculation
          0
        )
      }
    };

    return masterReport;
  }

  private generateMarkdownSummary(report: MasterReport): string {
    const md: string[] = [];

    md.push('# Codebase Audit Summary\n');
    md.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`);
    md.push('---\n');

    // Overall Summary
    md.push('## 📊 Overall Summary\n');
    md.push(`- **Total Files Scanned:** ${report.summary.filesScanned}`);
    md.push(`- **Files with Issues:** ${report.summary.filesWithIssues}`);
    md.push(`- **Total Issues Found:** ${report.summary.totalIssues}\n`);

    // Issues by Severity
    md.push('### Issues by Severity\n');
    md.push('| Severity | Count | Percentage |');
    md.push('|----------|-------|------------|');
    const total = report.summary.totalIssues;
    md.push(`| 🔴 Critical | ${report.summary.criticalIssues} | ${((report.summary.criticalIssues / total) * 100).toFixed(1)}% |`);
    md.push(`| 🟠 High | ${report.summary.highIssues} | ${((report.summary.highIssues / total) * 100).toFixed(1)}% |`);
    md.push(`| 🟡 Medium | ${report.summary.mediumIssues} | ${((report.summary.mediumIssues / total) * 100).toFixed(1)}% |`);
    md.push(`| 🟢 Low | ${report.summary.lowIssues} | ${((report.summary.lowIssues / total) * 100).toFixed(1)}% |\n`);

    // Colors
    md.push('## 🎨 Colors Audit\n');
    md.push(`- **Total Issues:** ${report.colors.totalIssues}`);
    md.push(`- **Files Affected:** ${report.colors.filesWithIssues}`);
    md.push(`- **Hex Colors:** ${report.colors.issuesByType.hex}`);
    md.push(`- **RGB Colors:** ${report.colors.issuesByType.rgb}`);
    md.push(`- **Named Colors:** ${report.colors.issuesByType.named}`);
    md.push(`- **Missing Imports:** ${report.colors.issuesByType['missing-import']}\n`);
    md.push('**Action Required:** Replace all hardcoded colors with imports from `globals/colors.tsx`\n');

    // Texts
    md.push('## 📝 Texts/i18n Audit\n');
    md.push(`- **Total Issues:** ${report.texts.totalIssues}`);
    md.push(`- **Files Affected:** ${report.texts.filesWithIssues}`);
    md.push(`- **Hardcoded Hebrew:** ${report.texts.issuesByType['hardcoded-hebrew']}`);
    md.push(`- **Hardcoded English:** ${report.texts.issuesByType['hardcoded-english']}`);
    md.push(`- **Missing i18n Import:** ${report.texts.issuesByType['no-i18n-import']}`);
    md.push(`- **Translation Keys (HE):** ${report.texts.translationStats.totalKeysHe}`);
    md.push(`- **Translation Keys (EN):** ${report.texts.translationStats.totalKeysEn}\n`);
    md.push('**Action Required:** Replace all hardcoded text with `t()` function and add missing keys to `locales/*.json`\n');

    // Constants
    md.push('## 🔢 Constants Audit\n');
    md.push(`- **Total Issues:** ${report.constants.totalIssues}`);
    md.push(`- **Files Affected:** ${report.constants.filesWithIssues}`);
    md.push(`- **Hardcoded Sizes:** ${report.constants.issuesByType['hardcoded-size']}`);
    md.push(`- **Repeated Values:** ${report.constants.issuesByType['repeated-value']}`);
    md.push(`- **Magic Numbers:** ${report.constants.issuesByType['magic-number']}`);
    md.push(`- **Missing Imports:** ${report.constants.issuesByType['missing-import']}\n`);
    md.push('**Action Required:** Replace magic numbers with constants from `globals/constants.tsx`\n');

    // Responsive
    md.push('## 📱 Responsive Design Audit\n');
    md.push(`- **Total Issues:** ${report.responsive.totalIssues}`);
    md.push(`- **Files Affected:** ${report.responsive.filesWithIssues}`);
    md.push(`- **Direct Dimensions:** ${report.responsive.issuesByType['dimensions-direct']}`);
    md.push(`- **No Responsive Functions:** ${report.responsive.issuesByType['no-responsive-function']}`);
    md.push(`- **No Screen Size Checks:** ${report.responsive.issuesByType['no-screen-size-check']}`);
    md.push(`- **No Platform Checks:** ${report.responsive.issuesByType['no-platform-check']}`);
    md.push(`- **Missing Imports:** ${report.responsive.issuesByType['missing-import']}\n`);
    md.push('**Action Required:** Use responsive functions from `globals/responsive.ts` for all layouts\n');

    // Unused Files
    md.push('## 🗑️ Unused Files Audit\n');
    md.push(`- **Unused Files:** ${report.unusedFiles.unusedFiles}`);
    md.push(`- **Duplicate Files:** ${report.unusedFiles.duplicateFiles}`);
    md.push(`- **Old/Backup Files:** ${report.unusedFiles.oldBackupFiles}`);
    const spaceMB = (report.unusedFiles.potentialSpaceSaved / 1024 / 1024).toFixed(2);
    md.push(`- **Potential Space to Reclaim:** ${spaceMB} MB\n`);
    md.push('**Action Required:** Review and remove unused/duplicate files\n');

    // Architecture/Structure
    md.push('## 🏗️ Structure Audit\n');
    md.push(`- **Total Issues:** ${report.structure.totalIssues}\n`);
    md.push('**Action Required:** specific file naming and placement corrections\n');

    // Priority Actions
    md.push('## 🎯 Priority Actions\n');
    md.push('### Critical (Fix Immediately)\n');
    if (report.summary.criticalIssues > 0) {
      md.push(`1. Fix ${report.summary.criticalIssues} critical issues`);
      md.push('   - Focus on missing imports and hardcoded values in production code\n');
    } else {
      md.push('✅ No critical issues found!\n');
    }

    md.push('### High Priority (Fix Soon)\n');
    md.push(`1. Colors: Replace ${report.colors.issuesByType.hex + report.colors.issuesByType.rgb} hardcoded colors`);
    md.push(`2. Texts: Replace ${report.texts.issuesByType['hardcoded-hebrew']} hardcoded Hebrew texts`);
    md.push(`3. Responsive: Fix ${report.responsive.issuesByType['no-responsive-function']} non-responsive styles\n`);

    md.push('### Medium Priority (Plan to Fix)\n');
    md.push(`1. Constants: Extract ${report.constants.issuesByType['repeated-value']} repeated values`);
    md.push(`2. Texts: Replace ${report.texts.issuesByType['hardcoded-english']} hardcoded English texts`);
    md.push(`3. Cleanup: Remove ${report.unusedFiles.unusedFiles} unused files\n`);

    // Next Steps
    md.push('## 📋 Next Steps\n');
    md.push('1. Review detailed reports in `audit-reports/` directory');
    md.push('2. Create a plan for fixing issues by priority');
    md.push('3. Fix critical and high-priority issues first');
    md.push('4. Run audits again after fixes to verify improvements');
    md.push('5. Set up pre-commit hooks to prevent new issues\n');

    // Files
    md.push('## 📁 Detailed Reports\n');
    md.push('- `colors-issues.json` - All color-related issues');
    md.push('- `texts-issues.json` - All text/i18n issues');
    md.push('- `constants-issues.json` - All constants issues');
    md.push('- `responsive-issues.json` - All responsive design issues');
    md.push('- `unused-files.json` - All unused/duplicate files');
    md.push('- `structure-issues.json` - Structural organization issues\n');

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

    console.log('\n📊 Master reports saved:');
    console.log(`   - ${jsonPath}`);
    console.log(`   - ${mdPath}\n`);
  }

  public printFinalSummary(report: MasterReport): void {
    console.log('\n' + '='.repeat(70));
    console.log('FINAL AUDIT SUMMARY'.padStart(45));
    console.log('='.repeat(70) + '\n');

    console.log(`📁 Files scanned: ${report.summary.filesScanned}`);
    console.log(`⚠️  Files with issues: ${report.summary.filesWithIssues}`);
    console.log(`🔍 Total issues found: ${report.summary.totalIssues}\n`);

    console.log('Issues breakdown:');
    console.log(`  🔴 Critical: ${report.summary.criticalIssues}`);
    console.log(`  🟠 High:     ${report.summary.highIssues}`);
    console.log(`  🟡 Medium:   ${report.summary.mediumIssues}`);
    console.log(`  🟢 Low:      ${report.summary.lowIssues}\n`);

    console.log('By category:');
    console.log(`  🎨 Colors:     ${report.colors.totalIssues} issues`);
    console.log(`  📝 Texts:      ${report.texts.totalIssues} issues`);
    console.log(`  🔢 Constants:  ${report.constants.totalIssues} issues`);
    console.log(`  📱 Responsive: ${report.responsive.totalIssues} issues`);
    console.log(`  🗑️  Unused:     ${report.unusedFiles.issues.length} files`);
    console.log(`  🏗️  Structure:  ${report.structure.totalIssues} issues\n`);

    console.log('📊 Detailed reports saved in: audit-reports/');
    console.log('📄 Read summary.md for action plan\n');

    console.log('='.repeat(70) + '\n');
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

      console.log('\n✅ Audit passed! No issues found.\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error running audits:', error);
      process.exit(1);
    });
}

export { MasterAuditor, MasterReport };




