import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  const inputPropsRegex = /InputProps=\{(\{[\s\S]*?\})\s*\}/g;
  
  content = content.replace(inputPropsRegex, (match, innerProps) => {
    changed = true;
    return `slotProps={{ input: ${innerProps} }}`;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed InputProps in ${path.relative(pagesDir, filePath)}`);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('InputProps=')) {
        fixFile(fullPath);
      }
    }
  }
}

console.log('Processing files with remaining InputProps...');
processDirectory(pagesDir);
console.log('\nProcessing complete!');