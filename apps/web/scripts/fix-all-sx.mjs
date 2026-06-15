import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixAllSx(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  content = content.replace(/sx=\{\{\s*\{([^}]+?)\s*\}\s*\}\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\{\s*\{([^}]+?)\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\s*\{([^}]+?)\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\{\s*([^}]+?)\s*\}\}/g, (match, inner) => {
    let fixedInner = inner.trim();
    fixedInner = fixedInner.replace(/^\{/, '').replace(/\}$/, '').trim();
    fixedInner = fixedInner.replace(/,\s*,/g, ',');
    fixedInner = fixedInner.replace(/,\s*$/, '');
    changed = true;
    return `sx={{ ${fixedInner} }}`;
  });
  
  content = content.replace(/sx=\{\s*\{([^}]+?)\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\{\{\s*([^}]+?)\s*\}\}\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\{\s*\{(\s*)/g, 'sx={{').replace(/(\s*)\}\s*\}\}/g, '}}');
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed sx in ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixAllSx(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();