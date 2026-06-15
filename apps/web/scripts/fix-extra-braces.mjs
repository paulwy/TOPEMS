import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixExtraBraces(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  content = content.replace(/sx=\{\{([^}]+?)\}\}\}/g, (match, inner) => {
    changed = true;
    return `sx={{${inner}}}`;
  });
  
  content = content.replace(/\}\}\}>/g, '}}>');
  
  content = content.replace(/sx=\{\{([^}]+?)\}\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{${inner}}}`;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed extra braces in ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixExtraBraces(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();