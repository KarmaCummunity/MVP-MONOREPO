require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process'); // פונקציה להרצת פקודות מערכת
const { GoogleGenerativeAI } = require("@google/generative-ai");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const baseDir = process.env.BASE_DIR || '../';
const repos = { 'server': 'KC-MVP-server', 'front': 'MVP', 'bot': 'dev-bot' };
const currentRepo = {}; 
const sessions = {};

// --- פונקציות עזר ---

function getRepoPath(chatId) {
    const repo = currentRepo[chatId] || 'bot';
    return path.resolve(__dirname, baseDir, repos[repo]);
}

// הרצת פקודות טרמינל
function runTerminal(command, cwd) {
    return new Promise((resolve) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                resolve(`❌ שגיאה:\n${stderr || error.message}`);
            } else {
                resolve(`✅ פלט:\n${stdout}`);
            }
        });
    });
}

function getProjectFiles(repoPath) {
    try {
        const files = fs.readdirSync(repoPath, { recursive: true });
        return files.filter(f => 
            !f.includes('node_modules') && !f.includes('.git') && 
            fs.statSync(path.join(repoPath, f)).isFile()
        ).slice(0, 50);
    } catch (e) { return []; }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith('/start')) return bot.sendMessage(chatId, 'סוכן פיתוח (Terminal Edition) מוכן.');

    const repoPath = getRepoPath(chatId);
    
    // פקודת טרמינל ידנית
    if (text.startsWith('/terminal')) {
        const command = text.replace('/terminal', '').trim();
        if (!command) return bot.sendMessage(chatId, 'נא לספק פקודה להרצה.');
        bot.sendMessage(chatId, `מריץ: \`${command}\`...`, { parse_mode: 'Markdown' });
        const result = await runTerminal(command, repoPath);
        return bot.sendMessage(chatId, result.substring(0, 4000));
    }

    // ניהול החלפת מאגרים
    if (text.startsWith('/repo')) {
        const parts = text.split(' ');
        if (parts.length < 2 || !repos[parts[1]]) return bot.sendMessage(chatId, 'מאגר לא נמצא.');
        currentRepo[chatId] = parts[1];
        delete sessions[chatId];
        return bot.sendMessage(chatId, `ההקשר עבר ל-${parts[1]}.`);
    }

    // לוגיקת סוכן חכמה
    try {
        const allFiles = getProjectFiles(repoPath);
        const git = simpleGit(repoPath);
        const status = await git.status();

        if (!sessions[chatId]) {
            sessions[chatId] = model.startChat({ history: [] });
        }

        // הזרקת קבצים רלוונטיים אוטומטית (מתוך ההודעה)
        let autoContext = "";
        allFiles.forEach(file => {
            if (text.includes(path.basename(file))) {
                const content = fs.readFileSync(path.join(repoPath, file), 'utf8');
                autoContext += `\nFILE CONTENT (${file}):\n${content}\n`;
            }
        });

        const systemPrompt = `אתה סוכן AI בכיר. יש לך גישה לקבצים ולטרמינל.
מאגר: ${repos[currentRepo[chatId] || 'bot']}.
קבצים: ${allFiles.join(', ')}
${autoContext}

יכולות מיוחדות:
1. כתיבת קבצים: [FILE:path/to/file.ext] code [/FILE]
2. הרצת פקודות טרמינל: אם ברצונך להריץ פקודה (כמו npm test), החזר אותה כך: [RUN]command[/RUN]

הוראות:
- אם כתבת קוד חדש, מומלץ להציע להריץ אותו או לבדוק אותו בטרמינל.
- ענה תמציתי.`;

        const result = await sessions[chatId].sendMessage(`${systemPrompt}\n\nUser: ${text}`);
        let responseText = result.response.text();

        // 1. טיפול בכתיבת קבצים
        const fileRegex = /\[FILE:(.*?)\]([\s\S]*?)\[\/FILE\]/g;
        let match;
        while ((match = fileRegex.exec(responseText)) !== null) {
            const fileName = match[1].trim();
            const code = match[2].trim();
            const targetPath = path.join(repoPath, fileName);
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, code + '\n', 'utf8');
            responseText = responseText.replace(match[0], `\n\n**עודכן קובץ: ${fileName}**\n\`\`\`javascript\n${code}\n\`\`\``);
        }

        // 2. טיפול בהרצת פקודות אוטונומית (Terminal Tool Use)
        const runRegex = /\[RUN\](.*?)\[\/RUN\]/g;
        let runMatch;
        let terminalResults = "";
        while ((runMatch = runRegex.exec(responseText)) !== null) {
            const cmd = runMatch[1].trim();
            const output = await runTerminal(cmd, repoPath);
            terminalResults += `\n\n**תוצאת הרצה (\`${cmd}\`):**\n${output}`;
            responseText = responseText.replace(runMatch[0], `*(מריץ פקודה: ${cmd})*`);
        }

        const finalMessage = (responseText + terminalResults).substring(0, 4000);
        return bot.sendMessage(chatId, finalMessage, { parse_mode: 'Markdown' });

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, `שגיאת סוכן: ${err.message}`);
    }
});