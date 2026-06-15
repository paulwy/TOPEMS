import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixExtraBracesFinal(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  content = content.replace(/sx=\{\{\s*\{/g, 'sx={{');
  content = content.replace(/\}\s*\}\s*\}/g, '}}}');
  content = content.replace(/\}\s*\}\s*\}/g, '}}}');
  
  content = content.replace(/sx=\{\{\s*\{([^}]+?)\s*\}\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\{\s*\{([^}]+?)\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/\}\}\s*\}\s*\}/g, '}}}}');
  content = content.replace(/\}\}\s*\}\s*\}/g, '}}}}');
  
  content = content.replace(/sx=\{\s*\{([^}]+?)\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\{\s*\{/g, 'sx={{').replace(/\}\s*\}\s*\}/g, '}}}');
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed extra braces in ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixExtraBracesFinal(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();