const fs = require('fs');
const path = require('path');

const targetFiles = [
    'donationScreens/ItemsScreen.tsx',
    'donationScreens/MoneyScreen.tsx',
    'screens/AdminAdminsScreen.tsx'
];

targetFiles.forEach(target => {
    const targetPath = path.join(__dirname, target);
    if (!fs.existsSync(targetPath)) return;

    let content = fs.readFileSync(targetPath, 'utf8');
    let lines = content.split('\n');

    // Apply responsive imports if missing
    const needsScaleSize = true;
    if (needsScaleSize && !lines.some(l => l.includes('import {') && l.includes('scaleSize') && l.includes('responsive'))) {
        const responsiveImportIdx = lines.findIndex(l => l.includes("from '../globals/responsive'"));
        if (responsiveImportIdx !== -1) {
            if (!lines[responsiveImportIdx].includes('scaleSize')) {
                lines[responsiveImportIdx] = lines[responsiveImportIdx].replace('import {', 'import { scaleSize, scaleFont, ');
            }
        } else {
            lines.unshift("import { scaleSize, scaleFont } from '../globals/responsive';");
        }
    }

    let inStyleSheet = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('StyleSheet.create({')) inStyleSheet = true;

        if (inStyleSheet) {
            // replace layout props
            lines[i] = lines[i].replace(/\b(padding|margin|gap|borderRadius|width|height|top|bottom|left|right)([A-Za-z]*):\s*([0-9]+)\b/g, '$1$2: scaleSize($3)');
            // replace font size
            lines[i] = lines[i].replace(/\b(fontSize):\s*([0-9]+)\b/g, '$1: scaleSize($2)');
            // For literal numeric layout inside generic styles:
            lines[i] = lines[i].replace(/\b([A-Za-z]*Padding[A-Za-z]*):\s*([0-9]+)\b/g, '$1: scaleSize($2)');
        }
    }

    fs.writeFileSync(targetPath, lines.join('\n'));
});

console.log('Fixed sizes in target files.');
