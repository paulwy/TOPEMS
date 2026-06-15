import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixSxFinal(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  content = content.replace(/sx=\{\s*(\{[^}]+\})\s*\}/g, (match, inner) => {
    const cleanedInner = inner.replace(/^\{/, '').replace(/\}$/, '').trim();
    changed = true;
    return `sx={{ ${cleanedInner} }}`;
  });
  
  content = content.replace(/sx=\{\s*\{(\s*)/g, 'sx={{').replace(/(\s*)\}\s*\}/g, '}}');
  
  content = content.replace(/sx=\{\s*\{\s*/g, 'sx={{').replace(/\s*\}\s*\}/g, '}}');
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}/g, (match, inner) => {
    let fixedInner = inner.trim();
    fixedInner = fixedInner.replace(/^\{\s*/, '').replace(/\s*\}$/, '');
    fixedInner = fixedInner.replace(/,\s*,/g, ',');
    fixedInner = fixedInner.replace(/,\s*$/, '');
    fixedInner = fixedInner.replace(/^\s*,/, '');
    fixedInner = fixedInner.replace(/\},\s*([^}])/g, '}, $1');
    fixedInner = fixedInner.replace(/\},\s*\}/g, '}}');
    if (inner.trim() !== fixedInner.trim()) {
      changed = true;
    }
    return `sx={{ ${fixedInner} }}`;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed sx issues in ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixSxFinal(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();