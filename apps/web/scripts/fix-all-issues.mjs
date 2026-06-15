import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}\s+sx=\{\s*([^}]+?)\s*\}/g, (match, first, second) => {
    changed = true;
    return `sx={{ ${first}, ${second} }}`;
  });
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}\s+color:\s*"([^"]+)"\s*=\{/g, (match, sxContent, color) => {
    changed = true;
    return `sx={{ ${sxContent}, color: "${color}" }} onClick={`;
  });
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}\s+color:\s*(\w+\.\w+)\s*=\{/g, (match, sxContent, color) => {
    changed = true;
    return `sx={{ ${sxContent}, color: ${color} }} onClick={`;
  });
  
  content = content.replace(/(\s+)=(\{)/g, ' $1=$2');
  
  content = content.replace(/\{\s*\}\s*\{\s*\}/g, '{}');
  
  content = content.replace(/\{\s*\}\s*\{/g, '}{');
  
  content = content.replace(/\}\s*\}\s*\}\s*>/g, '}}}');
  
  content = content.replace(/sx=\{\s*\{([^}]+?)\s*\}\s*\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\{\s*([^}]+?)\s*\}\}/g, (match, inner) => {
    changed = true;
    return `sx={{ ${inner} }}`;
  });
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}\s+flex:\s*(\d+)\s*=\{/g, (match, sxContent, flexVal) => {
    changed = true;
    return `sx={{ ${sxContent}, flex: ${flexVal} }} onClick={`;
  });
  
  content = content.replace(/sx=\{\s*([^}]+?)\s*\}\s+"([^"]+)"\s*=\{/g, (match, sxContent, attr) => {
    changed = true;
    return `sx={{ ${sxContent} }} ${attr}={`;
  });
  
  content = content.replace(/=\{\s*\}\s*=\{/g, '={{');
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixFile(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();