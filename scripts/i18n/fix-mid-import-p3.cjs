#!/usr/bin/env node
/**
 * Fix `import i18n from '@/i18n';` lines that were inserted inside multi-line import blocks.
 * Moves them to after the closing `}` of the block.
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
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

let filesFixed = 0;

for (const filePath of walk(WEB_ROOT)) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Quick check: does this file have the pattern?
  if (!content.includes("import i18n from '@/i18n'")) continue;

  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes("import i18n from '@/i18n'")) continue;

    // Check if this line is inside a multi-line import block
    const prev = lines[i - 1]?.trim() || '';
    if (!prev.endsWith('{') && !(prev.startsWith('import') && prev.includes('{') && !prev.includes('}'))) continue;

    // This line is inside a multi-line import block
    // Remove it and find where to add it later
    lines[i] = '';
    modified = true;

    // Find the end of this multi-line import block
    let endIdx = i;
    let depth = 1; // We're inside an opening {
    for (let j = i + 1; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (depth <= 0) {
        endIdx = j;
        break;
      }
    }

    if (endIdx > i) {
      // Add i18n import after the closing of this block
      lines[endIdx] = lines[endIdx] + '\n' + "import i18n from '@/i18n';";
    }
  }

  if (modified) {
    // Clean up empty lines
    const cleaned = lines.filter((l) => l !== '');
    filesFixed++;
    fs.writeFileSync(filePath, cleaned.join('\n'), 'utf-8');
  }
}

console.log(`\n=== Fix Mid-Import P3 ===`);
console.log(`Files fixed: ${filesFixed}`);
