const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'eslint-report.json');
try {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    let index = 0;
    data.forEach(file => {
        file.messages.forEach(msg => {
            if (msg.ruleId === 'react-hooks/exhaustive-deps') {
                index++;
                if (index <= 10) {
                    console.log(`${file.filePath}:${msg.line} - ${msg.message}`);
                }
            }
        });
    });
} catch (e) { console.error(e); }
