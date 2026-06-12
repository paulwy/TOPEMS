import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const srcDir = './src';

function fixUnusedImports(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const importRegex = /import\s+(\{[^}]+\})\s+from\s+['"]([^'"]+)['"];/g;
  let fixed = false;
  
  content = content.replace(importRegex, (match, importsStr, fromStr) => {
    const imports = importsStr.replace(/\{|}/g, '').split(',').map(s => s.trim()).filter(s => s);
    const usedImports = [];
    
    for (const imp of imports) {
      const importName = imp.split(' as ')[0].trim();
      const regex = new RegExp(`\\b${importName}\\b`, 'g');
      if (content.match(regex)) {
        usedImports.push(imp);
      } else {
        fixed = true;
      }
    }
    
    if (usedImports.length === 0) {
      return '';
    }
    
    return `import { ${usedImports.join(', ')} } from '${fromStr}';`;
  });
  
  if (fixed) {
    writeFileSync(filePath, content);
    console.log(`Fixed unused imports in: ${filePath}`);
  }
  
  return fixed;
}

function fixUnusedVariables(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let fixed = false;
  
  const varDeclRegex = /(const|let|var)\s+(\w+)\s*=\s*/g;
  const matches = [...content.matchAll(varDeclRegex)];
  
  for (const match of matches) {
    const varName = match[2];
    if (varName === 'e' || varName === 'event') continue;
    
    const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
    const count = (content.match(usageRegex) || []).length;
    
    if (count === 1) {
      content = content.replace(new RegExp(`\\b${match[1]}\\s+${varName}\\s*=`, 'g'), `${match[1]} _${varName} =`);
      fixed = true;
    }
  }
  
  if (fixed) {
    writeFileSync(filePath, content);
    console.log(`Fixed unused variables in: ${filePath}`);
  }
  
  return fixed;
}

function processDirectory(dir) {
  const files = [];
  
  function walk(currentDir) {
    const entries = readFileSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  try {
    const fs = require('fs');
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    console.error(`Error reading directory ${dir}:`, e);
  }
  
  return files;
}

console.log('Processing TypeScript files...');
const files = processDirectory(srcDir);
console.log(`Found ${files.length} files`);

let fixedCount = 0;
for (const file of files) {
  if (fixUnusedImports(file)) fixedCount++;
  if (fixUnusedVariables(file)) fixedCount++;
}

console.log(`Fixed ${fixedCount} files`);