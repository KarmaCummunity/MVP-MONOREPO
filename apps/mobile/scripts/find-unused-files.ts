#!/usr/bin/env ts-node
/**
 * Audit Script: Unused Files
 * 
 * Purpose: Scans the codebase to find files that are not imported/used anywhere
 * 
 * Detects:
 * - Files with no imports
 * - Duplicate files
 * - Old/backup files (.old, .backup, etc.)
 * - Test files without corresponding source files
 * 
 * Output: audit-reports/unused-files.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface UnusedFileIssue {
  file: string;
  type: 'unused' | 'duplicate' | 'old-backup' | 'orphaned-test';
  severity: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  suggestion: string;
  duplicateOf?: string;
  fileSize?: number;
}

interface UnusedFilesReport {
  timestamp: string;
  totalFiles: number;
  unusedFiles: number;
  duplicateFiles: number;
  oldBackupFiles: number;
  orphanedTests: number;
  potentialSpaceSaved: number; // in bytes
  issues: UnusedFileIssue[];
}

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.expo',
  'ios/Pods',
  'android/app/build',
  '.git',
  'coverage'
];

// Entry points that are always considered "used"
const ENTRY_POINTS = [
  'index.js',
  'index.ts',
  'index.tsx',
  'App.tsx',
  'App.ts',
  '_layout.tsx',
  'app.config.js',
  'babel.config.js',
  'metro.config.js'
];

// Patterns for old/backup files
const OLD_BACKUP_PATTERNS = [
  /\.old$/,
  /\.backup$/,
  /\.bak$/,
  /\.copy$/,
  /_old\./,
  /_backup\./,
  /_copy\./,
  /\(old\)/i,
  /\(backup\)/i,
  /\(copy\)/i
];

class UnusedFileFinder {
  private report: UnusedFilesReport;
  private rootDir: string;
  private allFiles: Set<string>;
  private importedFiles: Set<string>;
  private fileHashes: Map<string, string>;
  private duplicates: Map<string, string[]>;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.allFiles = new Set();
    this.importedFiles = new Set();
    this.fileHashes = new Map();
    this.duplicates = new Map();
    this.report = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      unusedFiles: 0,
      duplicateFiles: 0,
      oldBackupFiles: 0,
      orphanedTests: 0,
      potentialSpaceSaved: 0,
      issues: []
    };
  }

  private shouldExclude(filePath: string): boolean {
    return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
  }

  private isSourceFile(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(filePath);
  }

  private isEntryPoint(filePath: string): boolean {
    const basename = path.basename(filePath);
    return ENTRY_POINTS.includes(basename);
  }

  private isOldBackupFile(filePath: string): boolean {
    return OLD_BACKUP_PATTERNS.some(pattern => pattern.test(filePath));
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
        } else if (this.isSourceFile(filePath)) {
          results.push(filePath);
          this.allFiles.add(filePath);
        }
      });
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }

    return results;
  }

  private calculateFileHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Normalize content (remove comments and whitespace for better duplicate detection)
      const normalized = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*/g, '') // Remove line comments
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      return crypto.createHash('md5').update(normalized).digest('hex');
    } catch (error) {
      return '';
    }
  }

  private findDuplicates(): void {
    console.log('Finding duplicate files...');

    this.allFiles.forEach(file => {
      const hash = this.calculateFileHash(file);
      if (hash) {
        this.fileHashes.set(file, hash);

        if (!this.duplicates.has(hash)) {
          this.duplicates.set(hash, []);
        }
        this.duplicates.get(hash)!.push(file);
      }
    });

    // Report duplicates
    this.duplicates.forEach((files, hash) => {
      if (files.length > 1) {
        // Keep the first file, mark others as duplicates
        const [original, ...duplicates] = files;

        duplicates.forEach(duplicate => {
          const stat = fs.statSync(duplicate);
          this.addIssue({
            file: path.relative(this.rootDir, duplicate),
            type: 'duplicate',
            severity: 'medium',
            reason: `Duplicate of ${path.relative(this.rootDir, original)}`,
            suggestion: `Consider removing this duplicate file`,
            duplicateOf: path.relative(this.rootDir, original),
            fileSize: stat.size
          });
          this.report.duplicateFiles++;
          this.report.potentialSpaceSaved += stat.size;
        });
      }
    });
  }

  private extractImports(content: string, filePath: string): void {
    const lines = content.split('\n');

    lines.forEach(line => {
      // Match various import patterns
      const importPatterns = [
        /import\s+.*from\s+['"](\.\.?\/[^'"]+)['"]/,  // Relative imports
        /require\s*\(['"](\.\.?\/[^'"]+)['"]\)/,       // Require
        /import\s*\(['"](\.\.?\/[^'"]+)['"]\)/         // Dynamic import
      ];

      importPatterns.forEach(pattern => {
        const match = line.match(pattern);
        if (match) {
          const importPath = match[1];

          // Resolve the import path relative to the current file
          const fileDir = path.dirname(filePath);
          let resolvedPath = path.resolve(fileDir, importPath);

          // Try different extensions if no extension specified
          if (!path.extname(resolvedPath)) {
            const extensions = ['.ts', '.tsx', '.js', '.jsx'];
            for (const ext of extensions) {
              const withExt = resolvedPath + ext;
              if (fs.existsSync(withExt)) {
                resolvedPath = withExt;
                break;
              }
            }

            // Try index files
            const indexFiles = extensions.map(ext => path.join(resolvedPath, `index${ext}`));
            for (const indexFile of indexFiles) {
              if (fs.existsSync(indexFile)) {
                resolvedPath = indexFile;
                break;
              }
            }
          }

          this.importedFiles.add(resolvedPath);
        }
      });
    });
  }

  private findUnusedFiles(): void {
    console.log('Analyzing imports...');

    // First pass: collect all imports
    this.allFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        this.extractImports(content, file);
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    });

    // Mark entry points as used
    this.allFiles.forEach(file => {
      if (this.isEntryPoint(file)) {
        this.importedFiles.add(file);
      }
    });

    console.log('Finding unused files...');

    // Second pass: find files that are never imported
    this.allFiles.forEach(file => {
      const isUsed = this.importedFiles.has(file);
      const isEntry = this.isEntryPoint(file);

      if (!isUsed && !isEntry) {
        const stat = fs.statSync(file);
        this.addIssue({
          file: path.relative(this.rootDir, file),
          type: 'unused',
          severity: 'low',
          reason: 'File is not imported anywhere in the codebase',
          suggestion: 'Verify if this file is still needed, consider removing it',
          fileSize: stat.size
        });
        this.report.unusedFiles++;
        this.report.potentialSpaceSaved += stat.size;
      }
    });
  }

  private findOldBackupFiles(): void {
    console.log('Finding old/backup files...');

    this.allFiles.forEach(file => {
      if (this.isOldBackupFile(file)) {
        const stat = fs.statSync(file);
        this.addIssue({
          file: path.relative(this.rootDir, file),
          type: 'old-backup',
          severity: 'low',
          reason: 'File appears to be an old/backup version',
          suggestion: 'Consider removing this old/backup file',
          fileSize: stat.size
        });
        this.report.oldBackupFiles++;
        this.report.potentialSpaceSaved += stat.size;
      }
    });
  }

  private addIssue(issue: UnusedFileIssue): void {
    this.report.issues.push(issue);
  }

  public audit(): UnusedFilesReport {
    console.log('🗑️  Starting unused files audit...\n');

    const files = this.getAllFiles(this.rootDir);
    this.report.totalFiles = files.length;
    console.log(`Found ${files.length} source files to analyze\n`);

    this.findDuplicates();
    this.findUnusedFiles();
    this.findOldBackupFiles();

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
    console.log('UNUSED FILES AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nTotal files scanned: ${this.report.totalFiles}`);
    console.log(`Unused files: ${this.report.unusedFiles}`);
    console.log(`Duplicate files: ${this.report.duplicateFiles}`);
    console.log(`Old/backup files: ${this.report.oldBackupFiles}`);
    console.log(`Orphaned test files: ${this.report.orphanedTests}\n`);

    const spaceMB = (this.report.potentialSpaceSaved / 1024 / 1024).toFixed(2);
    console.log(`Potential space to reclaim: ${spaceMB} MB\n`);

    if (this.report.issues.length > 0) {
      console.log('Files to review:');

      const byType = {
        unused: this.report.issues.filter(i => i.type === 'unused'),
        duplicate: this.report.issues.filter(i => i.type === 'duplicate'),
        'old-backup': this.report.issues.filter(i => i.type === 'old-backup'),
        'orphaned-test': this.report.issues.filter(i => i.type === 'orphaned-test')
      };

      Object.entries(byType).forEach(([type, issues]) => {
        if (issues.length > 0) {
          console.log(`\n  ${type.toUpperCase()} (${issues.length} files):`);
          issues.slice(0, 5).forEach(issue => {
            console.log(`    - ${issue.file}`);
          });
          if (issues.length > 5) {
            console.log(`    ... and ${issues.length - 5} more`);
          }
        }
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// Main execution
if (require.main === module) {
  const rootDir = path.join(__dirname, '..');
  const outputPath = path.join(rootDir, 'audit-reports', 'unused-files.json');

  const finder = new UnusedFileFinder(rootDir);
  finder.audit();
  finder.saveReport(outputPath);
  finder.printSummary();

  process.exit(0);
}

export { UnusedFileFinder, UnusedFilesReport, UnusedFileIssue };




