import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pagesDir = join(process.cwd(), 'src/pages');

function fixSxSyntax(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  
  content = content.replace(
    /sx=\{\{\s*([^}]+?)\}\}\s+([a-z])/g,
    'sx={{ $1 }}, $2'
  );
  
  content = content.replace(
    /sx=\{\{\s*(display:\s*"flex")\s*\}\}\s+(alignItems|justifyContent|gap|flexDirection|p|m|bgcolor|borderBottom|borderColor)/g,
    'sx={{ $1, $2'
  );

  content = content.replace(
    /sx=\{\{\s*display:\s*"flex",?\s*\}\}\s+(\w+)/g,
    'sx={{ display: "flex", $1'
  );
  
  content = content.replace(
    /sx=\{\{\s*(display:\s*\{[^}]+\})\s*\}\}\s+(\w+)/g,
    'sx={{ $1, $2'
  );

  content = content.replace(
    /sx=\{\{\s*(width:\s*\{[^}]+\})\s*\}\}\s+(\w+)/g,
    'sx={{ $1, $2'
  );
  
  content = content.replace(
    /sx=\{\{\s*(\w+:\s*"[^"]+")\s*\}\}\s+(\w+)/g,
    'sx={{ $1, $2'
  );

  content = content.replace(
    /sx=\{\{\s*(boxShadow:\s*\d+)\s*\}\}\s+\.\.\./g,
    'sx={{ $1, ...'
  );

  content = content.replace(
    /sx=\{\{\s*(\&:hover:\s*\{[^}]+\})\s*\}\}\s+\.\.\./g,
    'sx={{ $1, ...'
  );

  content = content.replace(
    /sx=\{\{\s*(\&:hover:\s*\{[^}]+\})\s*\}\}\s+(p:|boxShadow:|borderRadius:|transition:)/g,
    'sx={{ $1, $2'
  );

  return content;
}

import { readdirSync } from 'fs';

const files = readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = join(pagesDir, file);
  const originalContent = readFileSync(filePath, 'utf-8');
  const fixedContent = fixSxSyntax(filePath);
  
  if (originalContent !== fixedContent) {
    writeFileSync(filePath, fixedContent, 'utf-8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('Done!');