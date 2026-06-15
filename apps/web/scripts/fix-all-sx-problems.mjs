import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pagesDir = join(process.cwd(), 'src/pages');

function fixSxAll(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  
  content = content.replace(
    /sx=\{\{\s*([^}]*\{[^}]+\})\}\s*,\s*([a-z]+):/g,
    'sx={{ $1, $2:'
  );
  
  content = content.replace(
    /sx=\{\{\s*([^}]*\{[^}]+\})\}\s*\}\s*([a-z])/g,
    'sx={{ $1 }}$2'
  );

  content = content.replace(
    /sx=\{\{\s*(display:\s*"grid")\s*,\s*(gridTemplateColumns:\s*\{[^}]+\})\}\s*,\s*(gap|py|px)/g,
    'sx={{ $1, $2, $3'
  );

  content = content.replace(
    /sx=\{\{\s*(display:\s*"flex")\s*,\s*(flexDirection:\s*"[^"]+")\}\s*,\s*(gap|py|px|alignItems|justifyContent)/g,
    'sx={{ $1, $2, $3'
  );

  content = content.replace(
    /sx=\{\{\s*(display:\s*\{[^}]+\})\}\s*,\s*(alignItems|justifyContent|gap|flexDirection|p|m|bgcolor)/g,
    'sx={{ $1, $2'
  );

  content = content.replace(
    /sx=\{\{\s*(width:\s*\{[^}]+\})\}\s*,\s*(\w+)/g,
    'sx={{ $1, $2'
  );

  content = content.replace(
    /sx=\{\{\s*(\&:hover:\s*\{[^}]+\})\}\s*,\s*(\w+)/g,
    'sx={{ $1, $2'
  );

  content = content.replace(
    /sx=\{\{\s*(boxShadow:\s*\d+)\}\s*,\s*(\w+)/g,
    'sx={{ $1, $2'
  );

  content = content.replace(
    /sx=\{\{\s*([^}]+?)\}\},\s*(\w+)=/g,
    (match, sxContent, propName) => {
      return `sx={{${sxContent}}} ${propName}=`;
    }
  );

  content = content.replace(
    /sx=\{\{\s*([^}]+?)\}\}\s*,\s*(\w+)=/g,
    (match, sxContent, propName) => {
      return `sx={{${sxContent}}} ${propName}=`;
    }
  );

  content = content.replace(
    /sx=\{\{\s*([^}]+\})\}\s*\}\s*([a-zA-Z])/g,
    (match, sxContent, nextChar) => {
      return `sx={{${sxContent}}} ${nextChar}`;
    }
  );

  return content;
}

import { readdirSync } from 'fs';

const files = readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = join(pagesDir, file);
  const originalContent = readFileSync(filePath, 'utf-8');
  const fixedContent = fixSxAll(filePath);
  
  if (originalContent !== fixedContent) {
    writeFileSync(filePath, fixedContent, 'utf-8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('Done!');