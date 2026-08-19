#!/usr/bin/env node
/**
 * Fix misplaced useTranslation hooks from P3 batch script.
 *
 * The batch script sometimes inserts `const { t } = useTranslation('module');`
 * inside object literals, type declarations, or function call arguments.
 * This script detects and fixes these by:
 * 1. Removing the misplaced hook line
 * 2. Replacing t('...') with i18n.t('...')
 * 3. Adding import i18n from '@/i18n' if needed
 * 4. Removing unused useTranslation import
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git', '__tests__'].includes(entry.name)) continue;
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

let totalFixed = 0;
let filesFixed = 0;

for (const filePath of walk(path.join(WEB_ROOT, 'pages', 'mes'))) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('useTranslation')) continue;

  const lines = content.split('\n');
  let modified = false;
  let fixCount = 0;

  // Find misplaced `const { t } = useTranslation(...)` lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^const\s+\{\s*t\s*\}\s*=\s*useTranslation\(/.test(line)) {
      // Check context: is this inside an object literal or type declaration?
      // Look at surrounding lines
      const prev = lines[i - 1]?.trim() || '';
      const next = lines[i + 1]?.trim() || '';

      // Heuristic: if prev is `{` or `string,` or type params, or next is not a statement
      const isMisplaced =
        prev.endsWith('{') ||
        prev.endsWith(',') ||
        prev.includes('Record<') ||
        prev.includes('string,') ||
        (next.includes(':') && !next.includes('const')) ||
        prev === '';

      // Also check: is there a function/component declaration before this?
      // If the line above is part of a function call argument, it's misplaced
      if (isMisplaced || prev.includes('as unknown as') || prev.includes('createCrudPageAdapter')) {
        // Remove the misplaced hook line
        lines[i] = '';
        fixCount++;
        modified = true;
        if (verbose) console.log(`  [remove-hook] ${path.relative(WEB_ROOT, filePath)}:${i + 1}`);
      }
    }
  }

  if (modified) {
    // Now replace t('...') with i18n.t('...') for lines that don't have useTranslation
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('useTranslation')) continue;
      if (/\bt\s*\(\s*['"`]/.test(lines[i]) && !lines[i].includes('i18n.t(')) {
        lines[i] = lines[i].replace(/\bt\s*\(\s*(['"`])/g, 'i18n.t($1');
        fixCount++;
      }
    }

    // Add i18n import if needed
    const usesI18n = lines.some((l) => /i18n\.t\s*\(/.test(l) && !/import/.test(l));
    const hasI18nImport = lines.some((l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));
    if (usesI18n && !hasI18nImport) {
      let lastImport = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) lastImport = i;
        else if (lastImport >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, "import i18n from '@/i18n';");
      }
    }

    // Remove unused useTranslation import
    const hasUseTranslation = lines.some((l) => l.includes('useTranslation'));
    const hasHookCall = lines.some((l) => /const\s+\{\s*t\s*\}\s*=\s*useTranslation\(/.test(l));
    if (!hasHookCall && hasUseTranslation) {
      // Check if useTranslation is imported but not used
      const importLine = lines.findIndex(
        (l) => l.includes('import { useTranslation }') || l.includes('import { useTranslation,')
      );
      if (importLine !== -1) {
        // Check if useTranslation is actually used elsewhere
        const otherUsage = lines.some((l) => l.includes('useTranslation') && !l.trim().startsWith('import'));
        if (!otherUsage) {
          // Remove the import line or clean it up
          const impLine = lines[importLine];
          if (impLine.trim() === "import { useTranslation } from 'react-i18next';") {
            lines[importLine] = '';
          } else {
            // Remove just useTranslation from a multi-import
            lines[importLine] = impLine.replace(/\{\s*useTranslation,?\s*/g, '{ ').replace(/,\s*useTranslation/g, '');
          }
        }
      }
    }

    // Clean up empty lines
    const cleaned = lines.filter((l) => l !== '');
    filesFixed++;
    totalFixed += fixCount;
    if (!dryRun) {
      fs.writeFileSync(filePath, cleaned.join('\n'), 'utf-8');
    }
  }
}

// Also fix constants.tsx in ProductionDashboardPage
const constFile = path.join(WEB_ROOT, 'pages', 'mes', 'ProductionDashboardPage', 'constants.tsx');
if (fs.existsSync(constFile)) {
  const content = fs.readFileSync(constFile, 'utf-8');
  let lines = content.split('\n');
  let modified = false;

  // Remove misplaced hook line
  for (let i = 0; i < lines.length; i++) {
    if (/^const\s+\{\s*t\s*\}\s*=\s*useTranslation\(/.test(lines[i].trim())) {
      // Check if it's between type params and `= {`
      const prev = lines[i - 1]?.trim() || '';
      const next = lines[i + 1]?.trim() || '';
      if (prev.includes('string,') || prev.includes('Record<') || next.startsWith('>') || next.startsWith('= ')) {
        lines[i] = '';
        modified = true;
        if (verbose) console.log(`  [remove-hook] constants.tsx:${i + 1}`);
      }
    }
  }

  if (modified) {
    // Replace t(' with i18n.t('
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('useTranslation')) continue;
      if (/\bt\s*\(\s*['"`]/.test(lines[i]) && !lines[i].includes('i18n.t(')) {
        lines[i] = lines[i].replace(/\bt\s*\(\s*(['"`])/g, 'i18n.t($1');
      }
    }

    // Add i18n import
    const usesI18n = lines.some((l) => /i18n\.t\s*\(/.test(l) && !/import/.test(l));
    const hasI18nImport = lines.some((l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));
    if (usesI18n && !hasI18nImport) {
      let lastImport = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) lastImport = i;
        else if (lastImport >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, "import i18n from '@/i18n';");
      }
    }

    // Remove useTranslation import if unused
    const hasHookCall = lines.some((l) => /const\s+\{\s*t\s*\}\s*=\s*useTranslation\(/.test(l));
    if (!hasHookCall) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import { useTranslation }') && lines[i].includes("from 'react-i18next'")) {
          lines[i] = '';
        }
      }
    }

    const cleaned = lines.filter((l) => l !== '');
    filesFixed++;
    if (!dryRun) {
      fs.writeFileSync(constFile, cleaned.join('\n'), 'utf-8');
    }
  }
}

console.log(`\n=== Fix Misplaced Hooks P3 ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
console.log(`Files: ${filesFixed}, Fixes: ${totalFixed}`);
