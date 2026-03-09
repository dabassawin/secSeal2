const fs = require('fs');
const path = require('path');

const replacements = {
    "'พร้อมใช้งาน'": "SealStatus.READY",
    "\"พร้อมใช้งาน\"": "SealStatus.READY",
    "'จ่าย'": "SealStatus.ISSUED",
    "\"จ่าย\"": "SealStatus.ISSUED",
    "'ติดตั้งแล้ว'": "SealStatus.INSTALLED",
    "\"ติดตั้งแล้ว\"": "SealStatus.INSTALLED",
    "'ใช้งานแล้ว'": "SealStatus.USED",
    "\"ใช้งานแล้ว\"": "SealStatus.USED",
    "'เสียหาย'": "SealStatus.DAMAGED",
    "\"เสียหาย\"": "SealStatus.DAMAGED",
    "'สูญหาย'": "SealStatus.LOST",
    "\"สูญหาย\"": "SealStatus.LOST",
    "'รอตรวจสอบคืน'": "SealStatus.PENDING_RETURN",
    "\"รอตรวจสอบคืน\"": "SealStatus.PENDING_RETURN",
};

const regexPattern = new RegExp(Object.keys(replacements).join("|"), "g");

function processDirectory(dir, basePath) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && !file.startsWith('.')) {
                processDirectory(fullPath, basePath);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            // Ignore status files themselves
            if (file === 'status.ts') continue;
            processFile(fullPath, basePath);
        }
    }
}

function processFile(filePath, basePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // We only replace if there's a match, meaning we actually use a SealStatus
    if (!regexPattern.test(content)) return;

    // Replace all occurrences
    const newContent = content.replace(regexPattern, match => replacements[match]);

    if (newContent !== content) {
        // We modified the file. Now add import if missing.
        if (!newContent.includes('SealStatus')) return; // Just in case

        let finalContent = newContent;
        if (!finalContent.includes("import { SealStatus }")) {
            // compute relative path from filePath to basePath/constants/status
            const constantsDir = path.join(basePath, 'constants');
            let relativePath = path.relative(path.dirname(filePath), constantsDir);
            if (!relativePath.startsWith('.')) {
                relativePath = './' + relativePath;
            }
            // convert Windows backslashes to forward slashes
            relativePath = relativePath.replace(/\\/g, '/');

            const importStatement = `import { SealStatus } from '${relativePath}/status';\n`;

            // Insert after the last import, or at the top
            const importsEndIndex = finalContent.lastIndexOf('import ');
            if (importsEndIndex !== -1) {
                const nextNewline = finalContent.indexOf('\n', importsEndIndex);
                finalContent = finalContent.slice(0, nextNewline + 1) + importStatement + finalContent.slice(nextNewline + 1);
            } else {
                finalContent = importStatement + finalContent;
            }
        }

        fs.writeFileSync(filePath, finalContent, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

// target SealClient
processDirectory(path.join(__dirname, 'SealClient', 'src'), path.join(__dirname, 'SealClient', 'src'));

// target SealTechnician
processDirectory(path.join(__dirname, 'SealTechnician', 'src'), path.join(__dirname, 'SealTechnician', 'src'));

console.log("Done refactoring frontend!");
