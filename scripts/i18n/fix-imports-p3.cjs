#!/usr/bin/env node
/**
 * Fix import statements broken by P3 batch script.
 *
 * Issues:
 * 1. `import i18n from '@/i18n';` inserted inside multi-line import blocks
 * 2. useTranslation import removed incorrectly from multi-import lines
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const verbose = true;

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '__tests__'].includes(entry.name)) continue;
      results.push(...walk(path.join(dir, entry.name)));
    } else if (
      /\.[mc]?[tj]sx?$/.test(entry.name) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');
  let modified = false;

  // 1. Find and fix `import i18n from '@/i18n';` inside multi-line import blocks
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("import i18n from '@/i18n'")) {
      // Check if the previous line starts a multi-line import
      const prev = lines[i - 1]?.trim() || '';
      if (prev.endsWith('{') || (prev.startsWith('import') && prev.includes('{') && !prev.includes('}'))) {
        // This is inside a multi-line import block - remove it and find where to add it later
        lines[i] = '';
        modified = true;
        if (verbose) console.log(`  [remove-mid-import] ${path.relative(WEB_ROOT, filePath)}:${i + 1}`);

        // Find the end of this multi-line import block
        let endIdx = i;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('}')) {
            endIdx = j;
            break;
          }
        }
        // Add i18n import after the closing of this block
        if (endIdx > i) {
          lines[endIdx] = lines[endIdx] + '\n' + "import i18n from '@/i18n';";
          if (verbose) console.log(`  [add-after-block] ${path.relative(WEB_ROOT, filePath)}:${endIdx + 1}`);
        }
      }
    }
  }

  if (modified) {
    // Clean up empty lines that were left
    lines = lines.filter((l) => l !== '');
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  return modified;
}

let fixed = 0;
for (const f of walk(path.join(WEB_ROOT, 'pages', 'mes'))) {
  if (fixImports(f)) fixed++;
}

// Also fix constants.tsx
const constFile = path.join(WEB_ROOT, 'pages', 'mes', 'ProductionDashboardPage', 'constants.tsx');
if (fs.existsSync(constFile)) {
  if (fixImports(constFile)) fixed++;
}

console.log(`\n=== Fix Imports P3 ===`);
console.log(`Files fixed: ${fixed}`);
