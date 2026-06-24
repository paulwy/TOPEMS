const fs = require('fs');
const path = require('path');

const colorMap = [
  { old: /'#e5e7eb'/g, new: "'grey.200'" },
  { old: /"#e5e7eb"/g, new: '"grey.200"' },
  { old: /'#f9fafb'/g, new: "'grey.50'" },
  { old: /"#f9fafb"/g, new: '"grey.50"' },
  { old: /'#f3f4f6'/g, new: "'grey.100'" },
  { old: /"#f3f4f6"/g, new: '"grey.100"' },
  { old: /'#d1d5db'/g, new: "'grey.300'" },
  { old: /"#d1d5db"/g, new: '"grey.300"' },
  { old: /'#4b5563'/g, new: "'text.secondary'" },
  { old: /"#4b5563"/g, new: '"text.secondary"' },
  { old: /'#6b7280'/g, new: "'text.secondary'" },
  { old: /"#6b7280"/g, new: '"text.secondary"' },
  { old: /'#9ca3af'/g, new: "'text.disabled'" },
  { old: /"#9ca3af"/g, new: '"text.disabled"' },
  { old: /'#111827'/g, new: "'text.primary'" },
  { old: /"#111827"/g, new: '"text.primary"' },
  { old: /'#3b82f6'/g, new: "'primary.main'" },
  { old: /"#3b82f6"/g, new: '"primary.main"' },
  { old: /'#10B981'/g, new: "'success.main'" },
  { old: /"#10B981"/g, new: '"success.main"' },
  { old: /'#facc15'/g, new: "'warning.main'" },
  { old: /"#facc15"/g, new: '"warning.main"' },
  { old: /'#fef3c7'/g, new: "'warning.light'" },
  { old: /"#fef3c7"/g, new: '"warning.light"' },
  { old: /'#EF4444'/g, new: "'error.main'" },
  { old: /"#EF4444"/g, new: '"error.main"' },
  { old: /'#2563eb'/g, new: "'primary.dark'" },
  { old: /"#2563eb"/g, new: '"primary.dark"' },
  { old: /'#22c55e'/g, new: "'success.dark'" },
  { old: /"#22c55e"/g, new: '"success.dark"' },
  { old: /'#F59E0B'/g, new: "'warning.main'" },
  { old: /"#F59E0B"/g, new: '"warning.main"' },
  { old: /'#6B7280'/g, new: "'grey.500'" },
  { old: /"#6B7280"/g, new: '"grey.500"' },
  { old: /'#3B82F6'/g, new: "'primary.main'" },
  { old: /"#3B82F6"/g, new: '"primary.main"' },
  { old: /'#8b5cf6'/g, new: "'secondary.main'" },
  { old: /"#8b5cf6"/g, new: '"secondary.main"' },
  { old: /'#a78bfa'/g, new: "'secondary.light'" },
  { old: /"#a78bfa"/g, new: '"secondary.light"' },
  { old: /'#ffffff'/g, new: "'white'" },
  { old: /"#ffffff"/g, new: '"white"' },
  { old: /'#000000'/g, new: "'black'" },
  { old: /"#000000"/g, new: '"black"' },
  { old: /'#1f2937'/g, new: "'grey.800'" },
  { old: /"#1f2937"/g, new: '"grey.800"' },
  { old: /'#374151'/g, new: "'grey.700'" },
  { old: /"#374151"/g, new: '"grey.700"' },
  { old: /'#737373'/g, new: "'grey.500'" },
  { old: /"#737373"/g, new: '"grey.500"' },
  { old: /'#e2e8f0'/g, new: "'border.default'" },
  { old: /"#e2e8f0"/g, new: '"border.default"' },
  { old: /'#f1f5f9'/g, new: "'grey.100'" },
  { old: /"#f1f5f9"/g, new: '"grey.100"' },
];

const excludedDirs = ['theme', 'constants/colors.ts'];

function shouldExclude(filePath) {
  return excludedDirs.some(dir => filePath.includes(dir));
}

function getAllFiles(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results.push(...getAllFiles(filePath));
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !shouldExclude(filePath)) {
      results.push(filePath);
    }
  });
  
  return results;
}

const srcDir = path.join(__dirname, '..', 'apps/web/src');
const files = getAllFiles(srcDir);

let totalChanges = 0;
let filesChanged = 0;

files.forEach((fullPath) => {
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changes = 0;
  
  colorMap.forEach(({ old: oldPattern, new: newStr }) => {
    const matches = content.match(oldPattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(oldPattern, newStr);
    }
  });
  
  if (changes > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const relPath = fullPath.replace(srcDir + '/', '');
    console.log(`Updated ${relPath}: ${changes} changes`);
    totalChanges += changes;
    filesChanged++;
  }
});

console.log(`\nDone! Updated ${filesChanged} files with ${totalChanges} total changes.`);