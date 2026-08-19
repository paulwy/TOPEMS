#!/usr/bin/env node
/**
 * Fix remaining module-level t() calls using TSC error output.
 *
 * Reads TSC errors, finds lines with "Cannot find name 't'",
 * and replaces t( with i18n.t( on those specific lines.
 * Also ensures import i18n from '@/i18n' exists.
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');

// Parse TSC errors from stdin or hardcoded list
const errors = [];
const input = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (input && fs.existsSync(input)) {
  const lines = fs.readFileSync(input, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^(.+?)\((\d+),\d+\): error TS2304: Cannot find name 't'/);
    if (m) {
      errors.push({ file: m[1], line: parseInt(m[2]) });
    }
  }
} else {
  // Read from stdin
  const stdin = fs.readFileSync(0, 'utf8');
  for (const line of stdin.split('\n')) {
    const m = line.match(/^(.+?)\((\d+),\d+\): error TS2304: Cannot find name 't'/);
    if (m) {
      errors.push({ file: m[1], line: parseInt(m[2]) });
    }
  }
}

// Group errors by file
const byFile = {};
for (const e of errors) {
  const relPath = e.file.replace(/^src\//, '');
  const fullPath = path.join(WEB_ROOT, relPath);
  if (!byFile[fullPath]) byFile[fullPath] = [];
  byFile[fullPath].push(e.line);
}

let totalFixed = 0;
let filesFixed = 0;

for (const [filePath, lineNums] of Object.entries(byFile)) {
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;
  let fixCount = 0;

  // Sort line numbers in descending order so we can edit from bottom to top
  // without affecting line numbers
  const sortedLines = [...new Set(lineNums)].sort((a, b) => b - a);

  for (const lineNum of sortedLines) {
    const idx = lineNum - 1; // 0-indexed
    if (idx >= lines.length) continue;

    const line = lines[idx];

    // Skip if already uses i18n.t
    if (/i18n\.t\s*\(/.test(line)) continue;

    // Skip if it's a const { t } = useTranslation line
    if (/const\s*\{\s*t\s*\}/.test(line)) continue;

    // Replace t( with i18n.t( on this line
    // Be careful: only replace standalone t( not part of other identifiers
    let newLine = line.replace(/\bt\s*\(\s*'/g, "i18n.t('");
    newLine = newLine.replace(/\bt\s*\(\s*"/g, 'i18n.t("');
    newLine = newLine.replace(/\bt\s*\(\s*`/g, 'i18n.t(`');

    if (newLine !== line) {
      lines[idx] = newLine;
      modified = true;
      fixCount++;
    }
  }

  // Ensure import i18n from '@/i18n' exists
  const usesI18nT = lines.some((l) => /i18n\.t\s*\(/.test(l));
  const hasI18nImport = lines.some((l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));

  if (usesI18nT && !hasI18nImport) {
    // Find the last import line that's NOT inside a multi-line import block
    let lastImportIdx = -1;
    let inImportBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*import\s+/.test(line)) {
        lastImportIdx = i;
        // Check if this is the start of a multi-line import
        if (line.includes('{') && !line.includes('}')) {
          inImportBlock = true;
        } else {
          inImportBlock = false;
        }
      } else if (inImportBlock) {
        // We're inside a multi-line import block
        if (/^\s*\}/.test(line) || /from\s+['"]/.test(line)) {
          lastImportIdx = i;
          inImportBlock = false;
        }
      } else if (line.trim() === '' && lastImportIdx >= 0) {
        // Empty line after imports, keep looking
        continue;
      } else if (lastImportIdx >= 0 && !/^\s*import/.test(line) && line.trim() !== '' && !inImportBlock) {
        // We've passed all imports
        break;
      }
    }

    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, "import i18n from '@/i18n';");
      modified = true;
      fixCount++;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
    filesFixed++;
    totalFixed += fixCount;
    console.log(`  Fixed ${fixCount} in ${path.relative(PAGES_DIR, filePath)}`);
  }
}

console.log(`\nFiles fixed: ${filesFixed}`);
console.log(`Total fixes: ${totalFixed}`);
