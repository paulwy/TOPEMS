const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../apps/web/src');

const patterns = [
  {
    regex: /error\(const error = err as \{ message\?: string \};error\.message \|\| '([^']+)'\);/g,
    replace: (match, p1) => `error((err as { message?: string }).message || '${p1}');`
  },
  {
    regex: /console\.error\('([^']+)': const error = err as \{ message\?: string \};error\.message\)/g,
    replace: (match, p1) => `console.error('${p1}': (err as { message?: string }).message)`
  },
  {
    regex: /setError\(const error = err as \{ message\?: string \};error\.message \|\| '([^']+)'\)/g,
    replace: (match, p1) => `setError((err as { message?: string }).message || '${p1}')`
  },
  {
    regex: /message: const error = err as \{ message\?: string \};error\.message \|\| '([^']+)',/g,
    replace: (match, p1) => `message: (err as { message?: string }).message || '${p1}',`
  },
  {
    regex: /message: const error = err as \{ message\?: string \};error\.message/g,
    replace: 'message: (err as { message?: string }).message'
  },
  {
    regex: /\nconst error = err as \{ message\?: string \};\n\s+message: error\.message/g,
    replace: ' message: (err as { message?: string }).message'
  }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      content = content.replace(pattern.regex, pattern.replace);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
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

console.log('Starting to fix all syntax errors...');
walkDir(srcDir);
console.log('Done!');