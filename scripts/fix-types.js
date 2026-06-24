const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps/web/src');

function getAllFiles(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results.push(...getAllFiles(filePath));
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !filePath.includes('node_modules') && !filePath.includes('.d.ts')) {
      results.push(filePath);
    }
  });
  
  return results;
}

const files = getAllFiles(srcDir);

files.forEach((fullPath) => {
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changed = false;

  content = content.replace(/catch\s*\(\s*(\w+)\s*\)\s*\{/g, (match, errorVar) => {
    changed = true;
    return `catch (${errorVar}: unknown) {`;
  });

  content = content.replace(/\.then\(\s*\(\s*(\w+)\s*:\s*any\s*\)/g, (match, varName) => {
    changed = true;
    return `.then((${varName})`;
  });

  content = content.replace(/\.catch\(\s*\(\s*(\w+)\s*:\s*any\s*\)/g, (match, varName) => {
    changed = true;
    return `.catch((${varName}: unknown)`;
  });

  content = content.replace(/\(\s*(v|value|item|e|event|arg|args|key|val|data)\s*:\s*any\s*\)\s*=>/g, (match, varName) => {
    changed = true;
    return `(${varName}: unknown) =>`;
  });

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const relPath = fullPath.replace(srcDir + '/', '');
    console.log(`Fixed ${relPath}`);
  }
});

console.log('Done!');