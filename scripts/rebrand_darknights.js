const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../frontend-darknights');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.next' && f !== 'out') {
                walkDir(dirPath, callback);
            }
        } else {
            callback(path.join(dir, f));
        }
    });
}

function processFile(filePath) {
    const ext = path.extname(filePath);
    if (!['.tsx', '.ts', '.css', '.json', '.md', '.html'].includes(ext)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Text Rebranding (Safe replacements)
    content = content.replace(/Blow Nights/g, 'DarkNights');
    content = content.replace(/Blow nights/g, 'DarkNights');
    content = content.replace(/blow-nights/g, 'darknights');
    content = content.replace(/blownights/g, 'darknights');
    
    // 2. Color inversions (Careful mapping for Light Theme)
    if (['.tsx', '.ts'].includes(ext)) {
        content = content.replace(/bg-slate-950/g, 'bg-slate-50');
        content = content.replace(/bg-slate-900/g, 'bg-white');
        content = content.replace(/bg-slate-800/g, 'bg-slate-100');
        
        content = content.replace(/text-white/g, 'text-slate-900');
        content = content.replace(/text-slate-200/g, 'text-slate-700');
        content = content.replace(/text-slate-300/g, 'text-slate-600');
        content = content.replace(/text-slate-400/g, 'text-slate-500');
        
        content = content.replace(/border-slate-800/g, 'border-slate-200');
        content = content.replace(/border-slate-700/g, 'border-slate-300');
        
        content = content.replace(/bg-fuchsia-600/g, 'bg-slate-900');
        content = content.replace(/text-fuchsia-400/g, 'text-slate-800');
        content = content.replace(/text-fuchsia-500/g, 'text-slate-900');
        content = content.replace(/from-fuchsia-600/g, 'from-slate-800');
        content = content.replace(/to-fuchsia-900/g, 'to-slate-950');
        content = content.replace(/border-fuchsia-500/g, 'border-slate-700');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath.replace(targetDir, '')}`);
    }
}

console.log('Starting bulk rebrand in frontend-darknights...');
walkDir(targetDir, processFile);
console.log('Bulk rebrand finished.');
