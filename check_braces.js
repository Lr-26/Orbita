import fs from 'fs';
const content = fs.readFileSync('c:/Users/DIEGO/Desktop/ORBITA/main.js', 'utf8');
let openBraces = 0, closeBraces = 0, openParen = 0, closeParen = 0;
for (let char of content) {
    if (char === '{') openBraces++;
    if (char === '}') closeBraces++;
    if (char === '(') openParen++;
    if (char === ')') closeParen++;
}
console.log(`Braces {}: ${openBraces} / ${closeBraces}`);
console.log(`Parens (): ${openParen} / ${closeParen}`);
