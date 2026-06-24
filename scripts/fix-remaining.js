const fs = require('fs');
const path = require('path');

const files = [
  'apps/web/src/api/gis.ts',
  'apps/web/src/api/notification.ts',
];

files.forEach((relPath) => {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  content = content.replace(/catch\s*\(\s*(\w+)\s*\)\s*\{/g, (match, errorVar) => {
    return `catch (${errorVar}: unknown) {`;
  });
  
  content = content.replace(/\.map\(\s*\(\s*(item|value)\s*\)\s*=>/g, (match, varName) => {
    return `.map((${varName}: Record<string, unknown>) =>`;
  });
  
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`Fixed ${relPath}`);
});

console.log('Done!');