const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps/web/src');

const colorMap = {
  '#e5e7eb': 'grey.200',
  '#f9fafb': 'grey.50',
  '#f3f4f6': 'grey.100',
  '#d1d5db': 'grey.300',
  '#4b5563': 'text.secondary',
  '#6b7280': 'text.secondary',
  '#9ca3af': 'text.disabled',
  '#9CA3AF': 'text.disabled',
  '#111827': 'text.primary',
  '#3b82f6': 'primary.main',
  '#10B981': 'success.main',
  '#facc15': 'warning.main',
  '#EF4444': 'error.main',
  '#2563eb': 'primary.dark',
  '#ffffff': 'white',
  '#000000': 'black',
  '#1f2937': 'grey.800',
  '#374151': 'grey.700',
  '#737373': 'grey.500',
  '#e2e8f0': 'border.default',
  '#f1f5f9': 'grey.100',
  '#10b981': 'success.main',
  '#ef4444': 'error.main',
  '#f59e0b': 'warning.main',
  '#8b5cf6': 'secondary.main',
  '#a78bfa': 'secondary.light',
  '#eff6ff': 'primary.light',
  '#1d4ed8': 'primary.dark',
  '#e8f5e9': 'success.light',
  '#2e7d32': 'success.dark',
  '#f5f5f5': 'grey.100',
  '#616161': 'grey.600',
  '#fef2f2': 'error.light',
  '#F8FAFC': 'grey.50',
  '#f8fafc': 'grey.50',
  '#dcfce7': 'success.lighter',
  '#16a34a': 'success.dark',
  '#fee2e2': 'error.lighter',
  '#7f1d1d': 'error.dark',
  '#b91c1c': 'error.darker',
  '#d1fae5': 'success.lighter',
  '#fecaca': 'error.light',
  '#fde68a': 'warning.light',
  '#fefce8': 'warning.lighter',
  '#fef08a': 'warning.light',
  '#eab308': 'warning.main',
  '#bbf7d0': 'success.light',
  '#bfdbfe': 'primary.light',
  '#e0e7ff': 'secondary.light',
  '#c7d2fe': 'secondary.main',
  '#ed6c02': 'warning.dark',
  '#e65100': 'warning.darker',
  '#0f172a': 'grey.900',
  '#cbd5e1': 'grey.400',
  '#64748b': 'grey.600',
  '#06b6d4': 'info.main',
};

function getAllFiles(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results.push(...getAllFiles(filePath));
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !filePath.includes('node_modules') && !filePath.includes('.d.ts') && !filePath.includes('constants/colors.ts') && !filePath.includes('theme/')) {
      results.push(filePath);
    }
  });
  
  return results;
}

const files = getAllFiles(srcDir);
let totalChanges = 0;
let filesChanged = 0;

files.forEach((fullPath) => {
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changed = false;
  
  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    const escapedColor = oldColor.replace(/#/g, '\\#');
    const singleQuoteRegex = new RegExp(`'${escapedColor}'`, 'g');
    const doubleQuoteRegex = new RegExp(`"${escapedColor}"`, 'g');
    
    const singleMatches = content.match(singleQuoteRegex);
    if (singleMatches) {
      content = content.replace(singleQuoteRegex, `'${newColor}'`);
      totalChanges += singleMatches.length;
      changed = true;
    }
    
    const doubleMatches = content.match(doubleQuoteRegex);
    if (doubleMatches) {
      content = content.replace(doubleQuoteRegex, `"${newColor}"`);
      totalChanges += doubleMatches.length;
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const relPath = fullPath.replace(srcDir + '/', '');
    console.log(`Updated ${relPath}`);
    filesChanged++;
  }
});

console.log(`\nDone! Updated ${filesChanged} files with ${totalChanges} total changes.`);
