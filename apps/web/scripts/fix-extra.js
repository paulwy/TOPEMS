import fs from 'fs';
import path from 'path';

const testDir = path.join(process.cwd(), 'src/pages/__tests__');

const files = fs.readdirSync(testDir).filter(file => file.endsWith('.test.tsx'));

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(testDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const pattern = /\}\)\);\n\s*\}\);\n/g;
  if (pattern.test(content)) {
    const newContent = content.replace(pattern, '}));\n');
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      fixedCount++;
      console.log(`Fixed: ${file}`);
    }
  }
});

console.log(`\nTotal fixed: ${fixedCount}`);
