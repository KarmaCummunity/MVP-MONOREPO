const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'eslint-report.json');
try {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    let exhaustiveDeps = [];
    data.forEach(file => {
        file.messages.forEach(msg => {
            if (msg.ruleId === 'react-hooks/exhaustive-deps') {
                exhaustiveDeps.push({
                    file: file.filePath,
                    line: msg.line,
                    message: msg.message
                });
            }
        });
    });
    console.log('Files to fix for react-hooks/exhaustive-deps:');
    exhaustiveDeps.slice(0, 5).forEach(m => console.log(`${m.file}:${m.line} ${m.message}`));
} catch (e) { console.error(e); }
