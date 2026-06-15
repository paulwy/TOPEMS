import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixCommaSyntax(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}/g, (match, inner) => {
    let fixedInner = inner;
    
    fixedInner = fixedInner.replace(/,\s*,/g, ',');
    fixedInner = fixedInner.replace(/,\s*}/g, '}');
    fixedInner = fixedInner.replace(/^\s*,/g, '');
    fixedInner = fixedInner.replace(/,\s*$/, '');
    
    fixedInner = fixedInner.replace(/,\s*([}\]])/g, '$1');
    fixedInner = fixedInner.replace(/([{[])\s*,/g, '$1');
    
    fixedInner = fixedInner.trim();
    
    if (fixedInner !== inner) {
      changed = true;
    }
    
    return `sx={{ ${fixedInner} }}`;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed comma syntax in ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixCommaSyntax(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();