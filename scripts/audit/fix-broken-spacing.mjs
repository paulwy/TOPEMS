#!/usr/bin/env node
/**
 * Fix broken spacing replacements from fix-token-convergence.mjs.
 *
 * The batch script partially replaced px values inside multi-value CSS strings,
 * e.g. `padding: '4px 8px'` → `padding: designTokens.spacing.xs 8px'`
 * (missing opening quote, stray closing quote).
 *
 * This script converts such broken patterns to template literals:
 * `padding: `${designTokens.spacing.xs} 8px``
 */

import fs from 'fs';
import path from 'path';

const WEB_SRC = path.resolve('apps/web/src');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
      results.push(...walk(full));
    } else if (/\.[mc]?[tj]sx?$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const SPACING_RE = /(designTokens\.spacing\.\w+)((?:\s+\d+px)+)'/g;

let totalFixed = 0;
let filesFixed = 0;

for (const filePath of walk(WEB_SRC)) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('designTokens.spacing.')) continue;

  let modified = false;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('designTokens.spacing.')) continue;

    SPACING_RE.lastIndex = 0;
    const match = SPACING_RE.exec(line);
    if (match) {
      const token = match[1];
      const rest = match[2];
      const replacement = `\`${token}${rest}\``;
      lines[i] = line.replace(SPACING_RE, replacement);
      totalFixed++;
      modified = true;
      if (verbose) {
        console.log(`  [fix-spacing] ${path.relative(WEB_SRC, filePath)}:${i + 1}`);
      }
      SPACING_RE.lastIndex = 0;
    }
  }

  if (modified) {
    filesFixed++;
    if (!dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'));
    }
  }
}

console.log(`\n=== Fix Broken Spacing ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
console.log(`Files: ${filesFixed}, Fixes: ${totalFixed}`);
