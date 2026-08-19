#!/usr/bin/env node
/**
 * Fix script: Add missing {} around i18n.t() in JSX attributes
 *
 * The enhanced batch script's str_lit replacement turned label='中文' into
 * label=i18n.t('key') (missing {} for JSX expression context).
 * This script finds and fixes: attr=i18n.t('...') -> attr={i18n.t('...')}
 *
 * Also fixes:
 * - i18n.t('...') used as JSX text without {} wrapping
 * - i18n.t('...') inside string literals (convert to template literal)
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');

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
  let fixCount = 0;
  const newLines = [...lines];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Fix 1: JSX attribute without braces: label=i18n.t('...') -> label={i18n.t('...')}
    // Pattern: word=i18n.t( but NOT word={i18n.t(
    const jsxAttrRe = /(\w+)=i18n\.t\(/g;
    let m;
    let newLine = line;
    while ((m = jsxAttrRe.exec(line)) !== null) {
      const before = line.substring(0, m.index + m[1].length + 1);
      // Make sure it's not already braced
      if (before.endsWith('={')) continue;
      // Make sure it's not inside a string (check for preceding quote)
      const charBefore = line.substring(m.index - 1, m.index);
      if (charBefore === '"' || charBefore === "'") continue;
      // Replace =i18n.t( with ={i18n.t(
      newLine = newLine.replace(m[0], `${m[1]}={i18n.t(`);
      // We need to close the brace after the matching )
      // Find the closing ) of i18n.t(...)
      const afterCall = newLine.substring(m.index + m[1].length + 2);
      let depth = 1;
      let endIdx = -1;
      for (let j = 0; j < afterCall.length; j++) {
        if (afterCall[j] === '(') depth++;
        if (afterCall[j] === ')') {
          depth--;
          if (depth === 0) {
            endIdx = j;
            break;
          }
        }
      }
      if (endIdx >= 0) {
        const insertPos = m.index + m[1].length + 2 + endIdx + 1;
        newLine = newLine.substring(0, insertPos) + '}' + newLine.substring(insertPos);
        fixCount++;
      }
      // Reset regex to avoid infinite loop
      line = newLine;
      jsxAttrRe.lastIndex = m.index + m[1].length + 2;
    }

    // Fix 2: i18n.t('...') as JSX text without braces: >i18n.t('...')< -> >{i18n.t('...')}<
    // Pattern: >i18n.t( without preceding {
    const jsxTextRe = />i18n\.t\(/g;
    while ((m = jsxTextRe.exec(newLine)) !== null) {
      const charAfterGt = newLine[m.index + 1];
      if (charAfterGt === '{') continue;
      newLine = newLine.substring(0, m.index + 1) + '{' + newLine.substring(m.index + 1);
      // Find matching ) and add }
      const afterCall = newLine.substring(m.index + 2);
      let depth = 1;
      let endIdx = -1;
      for (let j = 0; j < afterCall.length; j++) {
        if (afterCall[j] === '(') depth++;
        if (afterCall[j] === ')') {
          depth--;
          if (depth === 0) {
            endIdx = j;
            break;
          }
        }
      }
      if (endIdx >= 0) {
        const insertPos = m.index + 2 + endIdx + 1;
        newLine = newLine.substring(0, insertPos) + '}' + newLine.substring(insertPos);
        fixCount++;
      }
      line = newLine;
      jsxTextRe.lastIndex = m.index + 2;
    }

    // Fix 3: i18n.t('...') inside single-quoted string literal
    // Pattern: '...i18n.t('key')...' -> `...${i18n.t('key')}...`
    // Detect: ' followed by non-quote chars then i18n.t( then ' inside
    if (newLine.includes("'") && newLine.includes('i18n.t(')) {
      // Check if i18n.t is inside a single-quoted string
      const singleQuoteRe = /'([^']*)'/g;
      while ((m = singleQuoteRe.exec(newLine)) !== null) {
        if (m[1].includes('i18n.t(')) {
          // This string contains i18n.t() call - convert to template literal
          const inner = m[1];
          // Replace i18n.t('key') with ${i18n.t('key')}
          const fixed = inner.replace(/i18n\.t\(/g, '${i18n.t(');
          // Close the template expression - find the ) after i18n.t('key')
          let fixedContent = '';
          let j = 0;
          while (j < fixed.length) {
            if (fixed.substring(j, j + 9) === '${i18n.t(') {
              fixedContent += '${i18n.t(';
              j += 9;
              // Find the closing )
              let depth = 1;
              while (j < fixed.length && depth > 0) {
                if (fixed[j] === '(') depth++;
                if (fixed[j] === ')') {
                  depth--;
                  if (depth === 0) {
                    fixedContent += ')';
                    j++;
                    // Add } to close the template expression
                    fixedContent += '}';
                    break;
                  }
                }
                fixedContent += fixed[j];
                j++;
              }
            } else {
              fixedContent += fixed[j];
              j++;
            }
          }
          newLine = newLine.replace(m[0], '`' + fixedContent + '`');
          fixCount++;
          line = newLine;
          singleQuoteRe.lastIndex = m.index + fixedContent.length + 2;
        }
      }
    }

    // Fix 4: Object key without brackets: i18n.t('...'): -> [i18n.t('...')]:
    // This happens when Chinese was used as an object key
    const objKeyRe = /(\s|i18n\.t\([^)]+\))(\s*):/g;
    // Actually, let's just find bare i18n.t('...'): at start of object property
    const objKeyRe2 = /^(\s*)i18n\.t\((['"][^'"]+['"])\)\s*:/gm;
    while ((m = objKeyRe2.exec(newLine)) !== null) {
      newLine =
        newLine.substring(0, m.index + m[1].length) +
        '[i18n.t(' +
        m[2] +
        ')]:' +
        newLine.substring(m.index + m[1].length + m[0].length - m[1].length);
      fixCount++;
      line = newLine;
      objKeyRe2.lastIndex = m.index + m[1].length + m[2].length + 10;
    }

    if (newLine !== lines[i]) {
      newLines[i] = newLine;
    }
  }

  if (fixCount > 0 && !dryRun) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
  }

  return fixCount;
}

// Main
const dirs = args.filter((a) => !a.startsWith('--'));
const targetDirs = dirs.length > 0 ? dirs : ['.'];

let totalFixed = 0;
let filesFixed = 0;

for (const dir of targetDirs) {
  const basePath = path.isAbsolute(dir) ? dir : path.join(WEB_ROOT, dir);
  const files = collectFiles(basePath);
  for (const file of files) {
    const count = fixFile(file);
    if (count > 0) {
      const rel = path.relative(WEB_ROOT, file);
      console.log(`  ✅ ${rel}: ${count} fixes`);
      totalFixed += count;
      filesFixed++;
    }
  }
}

console.log(`\n总修复: ${totalFixed} 处, ${filesFixed} 文件${dryRun ? ' (DRY RUN)' : ''}`);
