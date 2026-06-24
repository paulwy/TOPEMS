const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../apps/web/src');

const errorPattern = /message: const error = err as \{ message\?: string \};error\.message \|\| '([^']+)',/g;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(errorPattern);
  
  if (matches && matches.length > 0) {
    content = content.replace(errorPattern, (match, p1) => {
      return `message: (err as { message?: string }).message || '${p1}',`;
    });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${matches.length} errors in: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      try {
        processFile(filePath);
      } catch (e) {
        console.error(`Error processing ${filePath}:`, e.message);
      }
    }
  });
}

console.log('Starting to fix syntax errors...');
walkDir(srcDir);
console.log('Done!');