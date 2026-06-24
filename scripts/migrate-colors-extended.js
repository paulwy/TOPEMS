const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps/web/src');

const colorMap = [
  { old: '#fecaca', new: 'red.200' },
  { old: '#64748b', new: 'grey.500' },
  { old: '#0f172a', new: 'grey.900' },
  { old: '#fefce8', new: 'yellow.100' },
  { old: '#fde68a', new: 'yellow.200' },
  { old: '#a16207', new: 'yellow.700' },
  { old: '#f8fafc', new: 'grey.50' },
  { old: '#d1fae5', new: 'green.100' },
  { old: '#475569', new: 'grey.600' },
  { old: '#94a3b8', new: 'grey.400' },
  { old: '#334155', new: 'grey.700' },
  { old: '#cbd5e1', new: 'grey.300' },
];

const filesToProcess = [
  'components/WorkflowTableExample.tsx',
  'components/WorkflowDesigner.tsx',
  'components/ProtectedRoute.tsx',
  'components/BISkeleton.tsx',
  'components/ExportModal.tsx',
];

filesToProcess.forEach((file) => {
  const fullPath = path.join(srcDir, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let changed = false;

  colorMap.forEach(({ old: oldColor, new: newColor }) => {
    const patterns = [
      new RegExp(`'${oldColor}'`, 'g'),
      new RegExp(`"${oldColor}"`, 'g'),
    ];

    patterns.forEach((pattern) => {
      if (content.match(pattern)) {
        content = content.replace(pattern, `'${newColor}'`);
        changed = true;
      }
    });
  });

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});

console.log('\nDone!');
