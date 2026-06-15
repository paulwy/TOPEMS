import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixAllRemaining(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  const sxSplitPattern = /sx=\{\s*([^}]+?)\s*\}\s*,\s*([a-zA-Z]+)\s*=/g;
  
  content = content.replace(sxSplitPattern, (match, sxContent, nextProp) => {
    const lastBrace = sxContent.lastIndexOf('}');
    if (lastBrace !== -1) {
      const beforeLastBrace = sxContent.substring(0, lastBrace).trim();
      const afterLastBrace = sxContent.substring(lastBrace).trim();
      if (beforeLastBrace.endsWith(',')) {
        const newSxContent = beforeLastBrace.substring(0, beforeLastBrace.length - 1).trim() + ' ' + afterLastBrace;
        changed = true;
        return `sx={{ ${newSxContent} }} ${nextProp}=`;
      }
    }
    return match;
  });
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}\s*,\s*([a-zA-Z]+)\s*=\s*([^,>]+?)(?=\s*(,|>|\}))/g, (match, sxContent, propName, propValue) => {
    changed = true;
    return `sx={{ ${sxContent}, ${propName}: ${propValue} }}`;
  });
  
  content = content.replace(/sx=\{\s*([^}]+?)\}\s*,\s*([^=]+?)\s*=/g, (match, sxContent, propName) => {
    changed = true;
    return `sx={{ ${sxContent} }} ${propName.trim()}=`;
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
    fixAllRemaining(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();