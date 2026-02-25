const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

const mappings = [
    { old: 'utils/apiService.ts', new: 'src/api/api.service.ts' },
    { old: 'utils/authService.ts', new: 'src/services/auth.service.ts' },
    { old: 'utils/postsService.ts', new: 'src/services/posts.service.ts' },
    { old: 'utils/chatService.ts', new: 'src/services/chat.service.ts' },
    { old: 'utils/statsService.ts', new: 'src/services/stats.service.ts' },
    { old: 'utils/notificationService.ts', new: 'src/services/notification.service.ts' },
    { old: 'utils/followService.ts', new: 'src/services/follow.service.ts' },
    { old: 'utils/storageService.ts', new: 'src/infrastructure/storage.service.ts' },
    { old: 'utils/databaseService.ts', new: 'src/infrastructure/database.service.ts' },
    { old: 'utils/config.constants.ts', new: 'src/infrastructure/config.ts' },
    { old: 'utils/urlValidator.ts', new: 'src/utils/validation/url-validator.ts' },
    { old: 'utils/profileUtils.ts', new: 'src/utils/helpers/profileUtils.ts' },
    { old: 'utils/itemCategoryUtils.ts', new: 'src/utils/helpers/itemCategoryUtils.ts' }
];

// 1. Create Directories and Move Files
console.log('--- Moving files ---');
mappings.forEach(mapping => {
    const oldPath = path.join(mobileRoot, mapping.old);
    const newPath = path.join(mobileRoot, mapping.new);

    if (fs.existsSync(oldPath)) {
        const newDir = path.dirname(newPath);
        if (!fs.existsSync(newDir)) {
            fs.mkdirSync(newDir, { recursive: true });
        }
        fs.renameSync(oldPath, newPath);
        console.log(`Moved: ${mapping.old} -> ${mapping.new}`);
    } else {
        console.log(`Warning: Could not find ${mapping.old}`);
    }
});

// Map of old absolute path WITHOUT extension to new absolute path WITHOUT extension
const absoluteMappings = mappings.reduce((acc, mapping) => {
    const oldAbs = path.join(mobileRoot, mapping.old).replace(/\.tsx?$/, '');
    const newAbs = path.join(mobileRoot, mapping.new).replace(/\.tsx?$/, '');
    acc[oldAbs] = newAbs;
    return acc;
}, {});

// 2. Update Imports in all source files
function walkSync(dir, filelist = []) {
    if (!fs.existsSync(dir)) return filelist;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.expo' || file === 'ios' || file === 'android' || file === '.git' || file === 'dist' || file === 'web' || file === 'build') {
            continue;
        }

        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
        } else {
            if (/\.(ts|tsx|js|jsx)$/.test(filepath)) {
                filelist.push(filepath);
            }
        }
    }
    return filelist;
}

const allFiles = walkSync(mobileRoot);
console.log(`\n--- Scanning ${allFiles.length} files for import updates ---`);

let updatedCount = 0;

allFiles.forEach(filepath => {
    let content = fs.readFileSync(filepath, 'utf-8');
    let originalContent = content;

    // Regex to match imports and dynamic imports
    // Matches: import ... from '...'; export ... from '...'; await import('...')
    const importRegex = /(import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;

    content = content.replace(importRegex, (match, type, p1, p2) => {
        const importStr = p1 || p2;
        if (!importStr || importStr.startsWith('@') || !importStr.startsWith('.')) {
            return match;
        }

        // Resolve absolute path
        const fileDir = path.dirname(filepath);
        const absoluteImportPath = path.resolve(fileDir, importStr);

        if (absoluteMappings[absoluteImportPath]) {
            const newAbsPath = absoluteMappings[absoluteImportPath];

            // Compute new relative path
            let relativePath = path.relative(fileDir, newAbsPath);
            // Ensure it starts with ./ or ../
            if (!relativePath.startsWith('.')) {
                relativePath = './' + relativePath;
            }
            // Fix windows paths if on windows
            relativePath = relativePath.replace(/\\/g, '/');

            return match.replace(importStr, relativePath);
        }

        return match;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log(`Updated imports in: ${path.relative(mobileRoot, filepath)}`);
        updatedCount++;
    }
});

console.log(`\n--- Finished! Updated ${updatedCount} files. ---`);
