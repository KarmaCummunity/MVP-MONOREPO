const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'eslint-report.json');
try {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    let msgs = [];
    data.forEach(file => {
        file.messages.forEach(msg => {
            if (['react/no-unescaped-entities', '@typescript-eslint/no-this-alias', '@typescript-eslint/no-empty-object-type'].includes(msg.ruleId)) {
                msgs.push(`${file.filePath}:${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId})`);
            }
        });
    });
    msgs.forEach(m => console.log(m));
} catch (e) { console.error(e); }
