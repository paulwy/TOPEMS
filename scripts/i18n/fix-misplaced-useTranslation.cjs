#!/usr/bin/env node
/**
 * Remove misplaced useTranslation() calls that ended up inside
 * const object/array literals due to the batch replacement script.
 *
 * A useTranslation call is "misplaced" if:
 * 1. It's inside an array literal (const xxx = [ ... useTranslation ... ])
 * 2. It's inside an object literal value (const xxx = { key: ..., useTranslation })
 * 3. The previous non-empty line ends with ',' or '{' or '[' (array/object context)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

const PAGES_DIR = path.resolve(__dirname, '../../apps/web/src/pages');
const P2_MODULES = ['gis', 'im', 'system', 'automation', 'finance', 'lowcode', 'hrm', 'pdm', 'scm', 'integration'];

let totalRemoved = 0;
let filesFixed = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;
  let removed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match: const { t } = useTranslation(...)
    if (!/const\s*\{\s*t\s*(?:,\s*\w+\s*)*\s*\}\s*=\s*useTranslation\s*\(/.test(trimmed)) {
      continue;
    }

    // Check if this is a misplaced useTranslation
    // Heuristic: look at the previous non-empty line
    let prevNonEmpty = '';
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].trim() !== '') {
        prevNonEmpty = lines[j].trim();
        break;
      }
    }

    // If previous line ends with ',' or '{' or '[' or starts with '{ name:' etc.
    // it's likely inside an array/object literal
    const prevEndsWithComma = /,\s*$/.test(prevNonEmpty);
    const prevIsObjectStart = /\{\s*$/.test(prevNonEmpty) || /\{\s*name:/.test(prevNonEmpty);
    const prevIsArrayStart = /\[\s*$/.test(prevNonEmpty);

    // Also check: is the line itself NOT at the start of a function body?
    // A proper useTranslation is the first statement in a component body
    // Check if previous line is the opening brace of a component
    const prevIsComponentBrace = /=>\s*\{\s*$/.test(prevNonEmpty) || /\)\s*\{\s*$/.test(prevNonEmpty);

    if (prevIsComponentBrace) {
      // This is a proper useTranslation call at component body start
      continue;
    }

    // Check context: track brace depth to see if we're inside array/object literal
    let braceDepth = 0;
    let bracketDepth = 0;
    let foundScopeStart = false;
    let scopeType = null; // 'array', 'object', 'function'

    for (let j = i - 1; j >= 0 && j >= i - 100; j--) {
      const l = lines[j];
      for (let k = l.length - 1; k >= 0; k--) {
        const ch = l[k];
        if (ch === '}') braceDepth++;
        if (ch === '{') {
          if (braceDepth === 0) {
            foundScopeStart = true;
            // Check what this brace opens
            const beforeBrace = l.substring(0, k).trim();
            if (/\[\s*$/.test(beforeBrace) || /,\s*$/.test(beforeBrace)) {
              scopeType = 'object_in_array';
            } else if (/=\s*$/.test(beforeBrace) || /:\s*$/.test(beforeBrace)) {
              scopeType = 'object_value';
            } else if (/=>\s*$/.test(beforeBrace) || /\)\s*$/.test(beforeBrace)) {
              scopeType = 'function';
            } else {
              scopeType = 'block';
            }
            break;
          }
          braceDepth--;
        }
        if (ch === ']') bracketDepth++;
        if (ch === '[') {
          if (bracketDepth === 0 && foundScopeStart) break;
          bracketDepth--;
        }
      }
      if (foundScopeStart) break;
    }

    // If we're inside an array or object literal (not a function body), remove
    if (
      scopeType === 'object_in_array' ||
      scopeType === 'object_value' ||
      prevEndsWithComma ||
      prevIsObjectStart ||
      prevIsArrayStart
    ) {
      lines[i] = '';
      modified = true;
      removed++;
      if (verbose) {
        console.log(`  Removed misplaced useTranslation at line ${i + 1} in ${path.relative(PAGES_DIR, filePath)}`);
        console.log(`    Context: prev="${prevNonEmpty.substring(0, 60)}" scope=${scopeType}`);
      }
    }
  }

  if (modified) {
    if (!dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'));
    }
    filesFixed++;
    totalRemoved += removed;
  }

  return removed;
}

function walkDir(dir, ext, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, ext, callback);
    } else if (entry.name.endsWith(ext)) {
      callback(fullPath);
    }
  }
}

console.log(`\n=== Remove misplaced useTranslation calls ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

for (const mod of P2_MODULES) {
  const modDir = path.join(PAGES_DIR, mod);
  if (!fs.existsSync(modDir)) continue;

  let modRemoves = 0;
  walkDir(modDir, '.tsx', (filePath) => {
    try {
      modRemoves += processFile(filePath);
    } catch (e) {
      console.error(`  ERROR: ${filePath}: ${e.message}`);
    }
  });
  if (modRemoves > 0) {
    console.log(`${mod}: ${modRemoves} misplaced calls removed`);
  }
}

console.log(`\nFiles fixed: ${filesFixed}`);
console.log(`Total removed: ${totalRemoved}`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
