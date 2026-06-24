const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../apps/web/src');

const patterns = [
  {
    regex: /} catch \(err: unknown\) \{([\s\S]*?)err\.message/g,
    replace: (match, group1) => {
      return `} catch (err: unknown) {${group1}const error = err as { message?: string };error.message`;
    }
  },
  {
    regex: /} catch \(err: unknown\) \{([\s\S]*?)err\.code/g,
    replace: (match, group1) => {
      return `} catch (err: unknown) {${group1}const error = err as { code?: string; message?: string };error.code`;
    }
  },
  {
    regex: /} catch \(error: unknown\) \{([\s\S]*?)error\.response/g,
    replace: (match, group1) => {
      return `} catch (error: unknown) {${group1}const err = error as { response?: { status?: number } };err.response`;
    }
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

console.log('Starting to fix unknown error handling...');
walkDir(srcDir);
console.log('Done!');