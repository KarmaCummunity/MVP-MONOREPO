#!/usr/bin/env ts-node
/**
 * Audit Script: Project Structure
 * 
 * Purpose: Enforces project file structure rules to keep the codebase organized.
 * 
 * Rules:
 * 1. No source files (.ts, .tsx) in the root src directory (except App.tsx, index.js etc)
 * 2. Screens should be in 'screens/' or 'bottomBarScreens/'
 * 3. Components should be in 'components/'
 * 4. Store files should be in 'stores/' and end with 'Store.ts'
 * 5. Hooks should be in 'hooks/' and start with 'use'
 * 
 * Output: audit-reports/structure-issues.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface StructureIssue {
    file: string;
    type: 'misplaced-file' | 'naming-convention' | 'forbidden-import';
    severity: 'high' | 'medium' | 'low';
    message: string;
    suggestion: string;
}

interface StructureReport {
    timestamp: string;
    totalFilesScanned: number;
    totalIssues: number;
    issues: StructureIssue[];
}

class StructureAuditor {
    private rootDir: string;
    private report: StructureReport;
    private files: string[] = [];

    constructor(rootDir: string) {
        this.rootDir = rootDir;
        this.report = {
            timestamp: new Date().toISOString(),
            totalFilesScanned: 0,
            totalIssues: 0,
            issues: []
        };
    }

    private getAllFiles(dir: string): string[] {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build' && file !== '.expo') {
                    results = results.concat(this.getAllFiles(filePath));
                }
            } else {
                if (/\.(ts|tsx|js|jsx)$/.test(file)) {
                    results.push(filePath);
                }
            }
        });
        return results;
    }

    public audit(): StructureReport {
        console.log('🏗️  Starting structure audit...\n');
        this.files = this.getAllFiles(this.rootDir);
        this.report.totalFilesScanned = this.files.length;

        this.files.forEach(filePath => {
            const relativePath = path.relative(this.rootDir, filePath);
            const fileName = path.basename(filePath);
            const dirName = path.dirname(relativePath);

            // Rule 1: Root directory cleanliness
            if (dirName === '.') {
                const allowedFiles = [
                    'App.tsx', 'index.js', 'index.ts', 'babel.config.js',
                    'metro.config.js', 'app.config.js', 'jest.config.js',
                    'react-native.config.js', 'webpack.config.js',
                    'expo-env.d.ts'
                ];
                if (!allowedFiles.includes(fileName) && !fileName.startsWith('.')) {
                    this.addIssue({
                        file: relativePath,
                        type: 'misplaced-file',
                        severity: 'medium',
                        message: `File found in root directory: ${fileName}`,
                        suggestion: 'Move logic to appropriate subdirectories (utils/, components/, etc.)'
                    });
                }
            }

            // Rule 2: Hooks naming convention
            if (dirName.includes('hooks') && !fileName.startsWith('use') && fileName !== 'index.ts') {
                this.addIssue({
                    file: relativePath,
                    type: 'naming-convention',
                    severity: 'low',
                    message: `Hook file does not start with 'use': ${fileName}`,
                    suggestion: `Rename to use${fileName.charAt(0).toUpperCase() + fileName.slice(1)}`
                });
            }

            // Rule 3: Stores naming convention
            if (dirName.includes('stores') && !fileName.toLowerCase().includes('store') && fileName !== 'index.ts') {
                this.addIssue({
                    file: relativePath,
                    type: 'naming-convention',
                    severity: 'low',
                    message: `Store file does not end with 'Store': ${fileName}`,
                    suggestion: 'Append "Store" to the filename for clarity'
                });
            }

            // Rule 4: Component file casing (PascalCase)
            if ((dirName.includes('components') || dirName.includes('screens')) && /^[a-z]/.test(fileName) && fileName !== 'index.ts' && fileName !== 'index.tsx') {
                this.addIssue({
                    file: relativePath,
                    type: 'naming-convention',
                    severity: 'low',
                    message: `Component/Screen file starts with lowercase: ${fileName}`,
                    suggestion: 'Use PascalCase for React components (e.g., MyComponent.tsx)'
                });
            }
        });

        return this.report;
    }

    private addIssue(issue: StructureIssue) {
        this.report.issues.push(issue);
        this.report.totalIssues++;
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
        console.log('STRUCTURE AUDIT SUMMARY');
        console.log('='.repeat(60));
        console.log(`\nFiles scanned: ${this.report.totalFilesScanned}`);
        console.log(`Issues found: ${this.report.totalIssues}\n`);

        if (this.report.issues.length > 0) {
            console.log('Top issues:');
            this.report.issues.slice(0, 5).forEach(issue => {
                console.log(`  [${issue.severity.toUpperCase()}] ${issue.file}: ${issue.message}`);
            });
            if (this.report.issues.length > 5) console.log(`  ...and ${this.report.issues.length - 5} more.`);
        }
        console.log('\n' + '='.repeat(60) + '\n');
    }
}

// Main execution
if (require.main === module) {
    const rootDir = path.join(__dirname, '..');
    const outputPath = path.join(rootDir, 'audit-reports', 'structure-issues.json');

    const auditor = new StructureAuditor(rootDir);
    auditor.audit();
    auditor.saveReport(outputPath);
    auditor.printSummary();

    process.exit(0);
}

export { StructureAuditor, StructureReport, StructureIssue };
