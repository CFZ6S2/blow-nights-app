const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../frontend-darknights');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.next' && f !== 'out') {
                walkDir(dirPath, callback);
            }
        } else {
            callback(dirPath);
        }
    });
}

function processFile(filePath) {
    const ext = path.extname(filePath);
    if (!['.tsx', '.ts', '.css', '.json', '.md', '.html'].includes(ext)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Remaining text rebrands
    content = content.replace(/BLOW NIGHTS/g, 'DARKNIGHTS');
    content = content.replace(/BlowNights/g, 'DarkNights');
    content = content.replace(/BLOW\{' '\}/g, 'DARKNIGHTS{\' \}\'');
    content = content.replace(/BLOW/g, 'DARKNIGHTS');
    
    // Demographic rebrands
    content = content.replace(/LGTBIQ\+/g, 'Liberal');
    content = content.replace(/LGBTQ\+/g, 'Liberal');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath.replace(targetDir, '')}`);
    }
}

console.log('Starting remaining bulk rebrand...');
walkDir(targetDir, processFile);
console.log('Finished.');
