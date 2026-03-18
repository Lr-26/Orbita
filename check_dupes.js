import fs from 'fs';
const content = fs.readFileSync('c:/Users/DIEGO/Desktop/ORBITA/main.js', 'utf8');
const lines = content.split('\n');
const functionNames = {};
for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
    if (match) {
        const name = match[1];
        if (functionNames[name]) {
            console.log(`Duplicate: ${name} at line ${i + 1} and ${functionNames[name]}`);
        } else {
            functionNames[name] = i + 1;
        }
    }
}
