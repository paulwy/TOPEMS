import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pagesDir = join(process.cwd(), 'src/pages');

function fixSxSyntaxComma(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  
  content = content.replace(
    /sx=\{\{([^}]+?)\}\},\s*(onClick|onChange|onClose|className|size|disabled|value|label|startIcon|endIcon|variant|color)/g,
    'sx={{$1}} $1'
  );

  content = content.replace(
    /sx=\{\{([^}]+?)\}\},\s*(\w+)=/g,
    (match, sxContent, propName) => {
      return `sx={{${sxContent}}} ${propName}=`;
    }
  );

  return content;
}

import { readdirSync } from 'fs';

const files = readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = join(pagesDir, file);
  const originalContent = readFileSync(filePath, 'utf-8');
  const fixedContent = fixSxSyntaxComma(filePath);
  
  if (originalContent !== fixedContent) {
    writeFileSync(filePath, fixedContent, 'utf-8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('Done!');