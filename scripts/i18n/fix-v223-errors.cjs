#!/usr/bin/env node
/**
 * Fix V223 TSC errors:
 * 1. {i18n.t('key')} in .ts files -> i18n.t('key') (remove braces)
 * 2. 'i18n.t('key')' -> i18n.t('key') (remove surrounding quotes)
 * 3. Template literal corruption: fix backtick + i18n.t issues
 * 4. JSX severity='infoi18n.t('...') -> severity='info'>... pattern fix
 * 5. Nested {i18n.t()} inside JSX text -> flatten
 */

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../../apps/web/src');
const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('Usage: node fix-v223-errors.cjs <file1> [file2] ...');
  process.exit(1);
}

let totalFixed = 0;

for (const f of files) {
  const filePath = path.isAbsolute(f) ? f : path.join(SRC, f);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');
  let fixed = 0;
  const isTs = filePath.endsWith('.ts') && !filePath.endsWith('.tsx');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Fix 1: In .ts files, {i18n.t('key')} -> i18n.t('key')
    if (isTs) {
      // Remove {} around i18n.t() calls
      line = line.replace(/\{i18n\.t\(/g, 'i18n.t(');
      // This is tricky - we need to remove the matching } too
      // But we can't just remove all } - we need to match the specific ones
      // Let's do it differently: find {i18n.t('...')} patterns
      const re = /\{i18n\.t\(('[^']*')\)\}/g;
      line = lines[i].replace(re, 'i18n.t($1)');
      if (line !== lines[i]) {
        fixed++;
        lines[i] = line;
        continue;
      }
      // Also fix {i18n.t('key', {...})} patterns
      const re2 = /\{i18n\.t\(('[^']*'),\s*(\{[^}]+\})\)\}/g;
      line = lines[i].replace(re2, 'i18n.t($1, $2)');
      if (line !== lines[i]) {
        fixed++;
        lines[i] = line;
        continue;
      }
      // Manual fix: find {i18n.t( and try to find matching )
      let idx = 0;
      let newLine = '';
      let lastEnd = 0;
      while (true) {
        const start = line.indexOf('{i18n.t(', lastEnd);
        if (start === -1) break;
        newLine += line.substring(lastEnd, start);
        // Find matching )
        let depth = 1;
        let j = start + 8; // skip {i18n.t(
        while (j < line.length && depth > 0) {
          if (line[j] === '(') depth++;
          if (line[j] === ')') depth--;
          j++;
        }
        // j is now after the closing )
        // Check if next char is }
        if (line[j] === '}') {
          newLine += 'i18n.t(' + line.substring(start + 8, j);
          lastEnd = j + 1;
        } else {
          // Not a simple {i18n.t()} pattern, keep as-is
          newLine += line.substring(start, start + 8);
          lastEnd = start + 8;
        }
      }
      newLine += line.substring(lastEnd);
      if (newLine !== line) {
        fixed++;
        lines[i] = newLine;
        continue;
      }
    }

    // Fix 2: 'i18n.t('key')' -> i18n.t('key') (quotes around i18n.t call)
    const quotedRe = /['"]i18n\.t\(('[^']*')\)['"]/g;
    const newLine2 = line.replace(quotedRe, 'i18n.t($1)');
    if (newLine2 !== line) {
      fixed++;
      lines[i] = newLine2;
      continue;
    }

    // Fix 3: Template literal with i18n.t inside that was corrupted
    // Pattern: `${i18n.t('key')} ` (${expr})` : ''}` -> `${i18n.t('key')} (${expr})`
    // This is complex - skip for now, handle manually

    // Fix 4: JSX attribute corruption: attr='valuei18n.t('key')
    // This happens when the script replaced text inside a JSX attribute string
    // e.g., severity='info'>暂无 -> severity='infoi18n.t('key')...
    // Need to find attr='texti18n.t( pattern and fix
    const attrCorruptRe = /(\w+)='([^']*)i18n\.t\(/g;
    let m;
    while ((m = attrCorruptRe.exec(line)) !== null) {
      // The attribute value has been corrupted - need to restore
      // Original was likely: attr='value'>Chinese_text
      // Corrupted to: attr='valuei18n.t('key')...
      // Fix: attr='value'>{i18n.t('key')...
      const attrName = m[1];
      const beforeI18n = m[2]; // text before i18n.t that shouldn't be in the attribute
      const fullMatch = m[0];
      // Find the position
      const pos = line.indexOf(fullMatch);
      // Find the end of the i18n.t() call
      let depth = 1;
      let j = pos + fullMatch.length;
      while (j < line.length && depth > 0) {
        if (line[j] === '(') depth++;
        if (line[j] === ')') depth--;
        j++;
      }
      // j is now after the closing )
      // Reconstruct: attr='beforeI18n'>{i18n.t('key')
      const i18nCall = line.substring(pos + attrName.length + 2 + beforeI18n.length, j);
      const afterPart = line.substring(j);
      line = line.substring(0, pos) + `${attrName}='${beforeI18n}'>{i18n.t(${i18nCall}` + afterPart;
      fixed++;
      break; // Restart scanning on modified line
    }
    if (line !== lines[i]) {
      lines[i] = line;
      continue;
    }
  }

  if (fixed > 0) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`  ✅ ${path.relative(SRC, filePath)}: ${fixed} fixes`);
    totalFixed += fixed;
  }
}

console.log(`\nTotal fixes: ${totalFixed}`);
