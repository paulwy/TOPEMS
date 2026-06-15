import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixAllSxFinal(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  const patterns = [
    /sx=\{\s*\{([^}]+?)\s*\}\s*\}/g,
    /sx=\{\{\s*\{([^}]+?)\s*\}\}/g,
    /sx=\{\s*([^}]+?)\s*\}\s*,\s*([a-zA-Z]+)\s*=/g,
    /sx=\{\s*([^}]+?)\}\s*,\s*([^=]+?)\s*=/g,
    /\}\s*\}\s*\}/g,
    /\{\s*\{\s*/g,
  ];
  
  patterns.forEach((pattern, index) => {
    content = content.replace(pattern, (match, ...args) => {
      changed = true;
      if (index === 0 || index === 1) {
        return `sx={{ ${args[0]} }}`;
      } else if (index === 2 || index === 3) {
        return `sx={{ ${args[0]} }} ${args[1].trim()}=`;
      } else if (index === 4) {
        return '}}}';
      } else if (index === 5) {
        return '{{';
      }
      return match;
    });
  });
  
  content = content.replace(/sx=\{\{\s*\{/g, 'sx={{').replace(/\}\s*\}\s*\}/g, '}}}');
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/\}\s*\}\s*\}/g, '}}}');
  content = content.replace(/\{\s*\{\s*/g, '{{');
  
  content = content.replace(/sx=\{\{\s*([^}]+?)\s*\}\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed issues in ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixAllSxFinal(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();