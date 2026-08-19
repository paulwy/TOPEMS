#!/usr/bin/env node
/**
 * Fix script: Add missing `import i18n from '@/i18n'` to files that use i18n.t()
 * but don't have the import statement.
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');

function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests', 'dist', 'build'].includes(entry.name)) continue;
      results.push(...collectFiles(fullPath));
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.stories.tsx')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Check if file uses i18n.t() in non-import lines
  const usesI18n = lines.some((l) => /i18n\.t\s*\(/.test(l) && !/import/.test(l));
  if (!usesI18n) return false;

  // Check if import already exists
  const hasImport = lines.some(
    (l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l) || /import\s+\{\s*i18n\s*\}/.test(l)
  );
  if (hasImport) return false;

  // Find the right place to insert the import
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('import ')) {
      lastImport = i;
    } else if (
      lastImport >= 0 &&
      !t.startsWith('import') &&
      t !== '' &&
      !t.startsWith("'") &&
      !t.startsWith('"') &&
      !t.startsWith('}')
    ) {
      break;
    }
  }

  if (lastImport >= 0) {
    // Check if the last import is a multi-line import (has { but no })
    const importLine = lines[lastImport].trim();
    if (importLine.includes('{') && !importLine.includes('}')) {
      // Find closing brace
      for (let i = lastImport + 1; i < lines.length; i++) {
        if (lines[i].includes('}')) {
          lines.splice(i + 1, 0, "import i18n from '@/i18n';");
          fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
          return true;
        }
      }
    } else {
      lines.splice(lastImport + 1, 0, "import i18n from '@/i18n';");
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      return true;
    }
  } else {
    // No imports found - add at the beginning
    lines.unshift("import i18n from '@/i18n';");
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    return true;
  }
  return false;
}

// Main
const files = collectFiles(WEB_ROOT);
let fixed = 0;
for (const file of files) {
  if (fixFile(file)) {
    const rel = path.relative(WEB_ROOT, file);
    console.log(`  ✅ ${rel}`);
    fixed++;
  }
}
console.log(`\n总修复: ${fixed} 文件`);
