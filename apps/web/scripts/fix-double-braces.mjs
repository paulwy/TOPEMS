import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixDoubleBraces(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  content = content.replace(/sx=\{\{\s*\{/g, 'sx={{');
  
  content = content.replace(/sx=\{\s*\{([^}]+?)\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\{\s*\{([^}]+?)\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\{\s*\{/g, 'sx={{');
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed double braces in ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixDoubleBraces(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();