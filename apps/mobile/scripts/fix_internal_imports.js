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

mappings.forEach(mapping => {
    const oldAbs = path.join(mobileRoot, mapping.old);
    const newAbs = path.join(mobileRoot, mapping.new);

    if (!fs.existsSync(newAbs)) {
        return;
    }

    let content = fs.readFileSync(newAbs, 'utf-8');
    let originalContent = content;

    const importRegex = /(import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;

    content = content.replace(importRegex, (match, type, p1, p2) => {
        const importStr = p1 || p2;
        if (!importStr || importStr.startsWith('@') || !importStr.startsWith('.')) {
            return match;
        }

        // Calculate what the absolute path of the TARGET was, assuming the file was still in `utils/`
        const oldFileDir = path.dirname(oldAbs);
        const targetAbs = path.resolve(oldFileDir, importStr);

        // Calculate new relative path from the NEW location to the target absolute path
        const newFileDir = path.dirname(newAbs);
        let newRelative = path.relative(newFileDir, targetAbs);

        // Ensure it starts with ./ or ../
        if (!newRelative.startsWith('.')) {
            newRelative = './' + newRelative;
        }
        newRelative = newRelative.replace(/\\/g, '/');

        // We only replace if the new relative is different from the current importStr
        // Wait! Since the script *already* ran once and modified some of those imports (the ones matching the 12 files),
        // those were correctly resolved... no wait! The previous script resolved the import against the *current* 
        // `fileDir` which was the NEW location because it scanned after moving!
        // So if the import was `./loggerService`, it resolved to `apps/mobile/src/services/loggerService`, 
        // which didn't match absoluteMappings, so it was LEFT UNCHANGED.
        // That means the text is STILL `./loggerService`. So we can safely "un-resolve" it against the OLD file dir!
        return match.replace(importStr, newRelative);
    });

    if (content !== originalContent) {
        fs.writeFileSync(newAbs, content, 'utf-8');
        console.log(`Fixed internal paths in: ${mapping.new}`);
    }
});
