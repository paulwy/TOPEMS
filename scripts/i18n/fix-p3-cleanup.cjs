#!/usr/bin/env node
/**
 * V221 P3: Comprehensive cleanup for misplaced hooks, broken imports, and t() references.
 * Processes all files in pages/{module} for the given modules.
 *
 * Usage: node scripts/i18n/fix-p3-cleanup.cjs --modules monitor,mobile,admin
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const args = process.argv.slice(2);
const modIdx = args.indexOf('--modules');
const modules = modIdx !== -1 && args[modIdx + 1]
  ? args[modIdx + 1].split(',')
  : ['monitor', 'mobile', 'admin'];
const verbose = args.includes('--verbose') || true;

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '__tests__'].includes(entry.name)) continue;
      results.push(...walk(path.join(dir, entry.name)));
    } else if (/\.[mc]?[tj]sx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

let totalFixes = 0;
let filesFixed = 0;

for (const mod of modules) {
  const modDir = path.join(WEB_ROOT, 'pages', mod);
  const files = walk(modDir);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('useTranslation') && !content.match(/\bt\s*\(\s*['"`]/)) continue;

    let lines = content.split('\n');
    let modified = false;
    let fixCount = 0;

    // 1. Find and remove misplaced useTranslation hooks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!/^const\s+\{\s*t\s*\}\s*=\s*useTranslation\(/.test(line)) continue;

      const prev = lines[i - 1]?.trim() || '';
      const next = lines[i + 1]?.trim() || '';

      // Heuristic: if the context is not a React component body
      const isMisplaced =
        prev.endsWith('{') ||
        prev.endsWith(',') ||
        prev.includes('as unknown as') ||
        prev.includes('createCrudPageAdapter') ||
        prev.includes('createAdapter') ||
        prev.includes('Record<') ||
        prev.includes('string,') ||
        (next.includes(':') && !next.includes('const') && !next.includes('function')) ||
        prev === '';

      if (isMisplaced) {
        lines[i] = '';
        fixCount++;
        modified = true;
        if (verbose) console.log(`  [remove-hook] ${path.relative(WEB_ROOT, filePath)}:${i + 1}`);
      }
    }

    // 2. Convert remaining t() to i18n.t() in files without useTranslation
    const hasHook = lines.some(l => /const\s+\{\s*t\s*\}\s*=\s*useTranslation\(/.test(l));
    if (!hasHook) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('useTranslation')) continue;
        if (lines[i].includes('import ')) continue;

        // Convert t('...') to i18n.t('...')
        if (/\bt\s*\(\s*['"`]/.test(lines[i]) && !lines[i].includes('i18n.t(')) {
          lines[i] = lines[i].replace(/\bt\s*\(/g, 'i18n.t(');
          fixCount++;
          modified = true;
        }

        // Fix t in dependency arrays: [t] or [t, ...] or [..., t]
        if (/\bt\b(?=\s*[,)\]])/.test(lines[i]) && !lines[i].includes('i18n.t') && !lines[i].includes('useTranslation')) {
          lines[i] = lines[i].replace(/\bt\b(?=\s*[,)\]])/g, 'i18n.t');
          fixCount++;
          modified = true;
        }
      }
    }

    // 3. Fix i18n import inside multi-line import blocks
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes("import i18n from '@/i18n'")) continue;

      const prev = lines[i - 1]?.trim() || '';
      if (prev.endsWith('{') || (prev.startsWith('import') && prev.includes('{') && !prev.includes('}'))) {
        lines[i] = '';
        let endIdx = i;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('}')) { endIdx = j; break; }
        }
        if (endIdx > i) {
          lines[endIdx] = lines[endIdx] + '\n' + "import i18n from '@/i18n';";
        }
        fixCount++;
        modified = true;
        if (verbose) console.log(`  [fix-import] ${path.relative(WEB_ROOT, filePath)}:${i + 1}`);
      }
    }

    if (modified) {
      // 4. Ensure i18n import exists
      const usesI18n = lines.some(l => /i18n\.t\s*\(/.test(l) && !/import/.test(l));
      const hasI18nImport = lines.some(l => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));
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

      // 5. Remove unused useTranslation import
      if (!hasHook) {
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          if (l.includes("import { useTranslation }") && l.includes("from 'react-i18next'")) {
            lines[i] = '';
          } else if (l.includes('useTranslation') && l.trim().startsWith('import')) {
            // Multi-import line: remove useTranslation
            lines[i] = l.replace(/,\s*useTranslation/g, '').replace(/\{\s*useTranslation,?\s*/g, '{ ');
          }
        }
      }

      // Clean up empty lines
      const cleaned = lines.filter(l => l !== '');
      filesFixed++;
      totalFixes += fixCount;
      fs.writeFileSync(filePath, cleaned.join('\n'), 'utf-8');
    }
  }
}

console.log(`\n=== P3 Cleanup ===`);
console.log(`Files fixed: ${filesFixed}, Total fixes: ${totalFixes}`);
