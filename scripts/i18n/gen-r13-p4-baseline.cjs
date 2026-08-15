#!/usr/bin/env node
/**
 * R13 V222 P4 Baseline Generator (Phase-A)
 *
 * Scan 7 target modules with DUAL-PATH STRATEGY per module M:
 *   1. apps/web/src/pages/M/**​/*.tsx  (V221-compatible "pages module")
 *   2. apps/web/src/M/**​/*.tsx        (for ai, microfrontend, components/templates that live at src top-level)
 *
 * Output: JSON with per-module counts + total, saved to docs/roadmap/artifacts/r13-v222-p4-baseline.json
 * Usage:  node scripts/i18n/gen-r13-p4-baseline.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const WEB_SRC = path.join(ROOT, 'apps', 'web', 'src');
const PAGES_DIR = path.join(WEB_SRC, 'pages');
const OUT_PATH = path.join(ROOT, 'docs', 'roadmap', 'artifacts', 'r13-v222-p4-baseline.json');

const P7_MODULES = [
  'components/templates',
  'ai',
  'microfrontend',
  'admin',
  'mobile',
  'monitor',
  'mes',
];
const ZERO_MODULES = P7_MODULES.slice(0, 3);
const BOUND_MAP = { admin: 500, mobile: 400, monitor: 450, mes: 470 };

const CHINESE_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

// ---------- file collection (skip tests/stories) ----------
function walkTsTsx(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests'].includes(e.name)) continue;
      walkTsTsx(full, out);
    } else if ((e.name.endsWith('.tsx') || e.name.endsWith('.ts')) &&
               !e.name.endsWith('.test.tsx') && !e.name.endsWith('.test.ts') &&
               !e.name.endsWith('.stories.tsx')) {
      out.push(full);
    }
  }
}

function collectModuleFiles(moduleName) {
  const r = [];
  // Path 1: pages/<M>
  walkTsTsx(path.join(PAGES_DIR, moduleName), r);
  // Path 2: src/<M> (top-level)
  if (moduleName.includes('/')) {
    // "components/templates" -> use src/components/templates
    walkTsTsx(path.join(WEB_SRC, moduleName), r);
  } else {
    walkTsTsx(path.join(WEB_SRC, moduleName), r);
  }
  return r;
}

// ---------- skip-line heuristics ----------
function lineSkip(t) {
  const x = t.trim();
  if (!x) return true;
  if (x.startsWith('//')) return true;
  if (x.startsWith('*') || x.startsWith('/*')) return true;
  if (/^import\s/.test(x)) return true;
  if (/^(export\s+)?(type|interface|enum)\s/.test(x)) return true;
  if (/^console\./.test(x)) return true;
  return false;
}

// ---------- count hardcoded CJK in one file ----------
function countFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fileCount = 0;
  for (const rawLine of lines) {
    if (lineSkip(rawLine)) continue;
    if (!CHINESE_RE.test(rawLine)) continue;

    // Strip known i18n t() / i18n.t() / tpl() call contents (already moved to JSON)
    let cleaned = rawLine
      .replace(/\bt\s*\(\s*['"`][^'"`]*['"`]/g, '')
      .replace(/i18n\.t\s*\(\s*['"`][^'"`]*['"`]/g, '')
      .replace(/tpl\s*\(\s*['"`][^'"`]*['"`]/g, '');

    // Count string literals with CJK (single/double/template quote)
    const strRe = /(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
    let m;
    while ((m = strRe.exec(cleaned)) !== null) fileCount++;

    // Count JSX text nodes with CJK: >中文<
    const jsxRe = />([^<>{}]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff][^<>{}]*)</g;
    while ((m = jsxRe.exec(cleaned)) !== null) if (m[1].trim()) fileCount++;

    // Count common i18n-attr values with CJK: label= title= placeholder= helperText= tooltip= alt= aria-label=
    const attrRe = /\b(?:label|title|placeholder|helperText|tooltip|alt|aria-label)\s*=\s*(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
    while ((m = attrRe.exec(cleaned)) !== null) fileCount++;
  }
  return fileCount;
}

// ---------- MAIN ----------
(async function main() {
  const perModule = {};
  let projectTotal = 0;
  const byModule = {};

  console.log('R13 V222 P4 baseline - 7 modules scan:');
  for (const mod of P7_MODULES) {
    const files = collectModuleFiles(mod);
    let count = 0;
    for (const f of files) count += countFile(f);
    perModule[mod] = { count, files: files.length };
    console.log(`  ${mod.padEnd(22)}: ${String(count).padStart(6)}  (${files.length} files)  type=${ZERO_MODULES.includes(mod) ? 'ZERO' : 'BOUND≤' + BOUND_MAP[mod]}`);
    byModule[mod] = perModule[mod];
  }

  // Compute project total (NOT only 7 modules — scan full apps/web/src non-test ts/tsx scope, same skip rules)
  const allFiles = [];
  walkTsTsx(WEB_SRC, allFiles);
  for (const f of allFiles) projectTotal += countFile(f);

  const report = {
    generatedAt: new Date().toISOString(),
    phase: 'R13-V222-P4-Baseline',
    p7Modules: P7_MODULES,
    zeroModules: ZERO_MODULES,
    boundMap: BOUND_MAP,
    perModule,
    totalProjectHardcodedLines: projectTotal,
    notes: 'count per file = string literal w/ CJK + JSX text w/ CJK + 7 known label/title/... attrs w/ CJK',
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`Project TOTAL hardcoded CJK lines: ${projectTotal}   (V221-P3 baseline ≈18856 expected ±5%)`);
  console.log(`Baseline JSON saved -> ${path.relative(ROOT, OUT_PATH)}`);
  console.log('═══════════════════════════════════════════════════');
})().catch((e) => { console.error(e); process.exit(1); });
