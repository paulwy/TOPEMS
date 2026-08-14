#!/usr/bin/env node
/**
 * V222 P4: General-purpose i18n batch replacement
 *
 * Processes .tsx files in ANY directory under src/, not just pages/.
 * Handles JSX text, JSX attributes, and string literals.
 * Adds useTranslation hook for React components, i18n.t() for module-level code.
 *
 * Usage:
 *   node scripts/i18n/batch-i18n-general.cjs --dir components/templates --module templates
 *   node scripts/i18n/batch-i18n-general.cjs --dir ai --module ai
 *   node scripts/i18n/batch-i18n-general.cjs --dir microfrontend --module microfrontend
 *   node scripts/i18n/batch-i18n-general.cjs --dir components/templates --module templates --dry
 *   node scripts/i18n/batch-i18n-general.cjs --dir components/templates --module templates --verbose
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');

const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const targetDir = dirIdx !== -1 ? args[dirIdx + 1] : '';
const modIdx = args.indexOf('--module');
const moduleName = modIdx !== -1 ? args[modIdx + 1] : '';
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]/;

if (!targetDir || !moduleName) {
  console.error('Usage: --dir <relative-to-src> --module <namespace>');
  process.exit(1);
}

const BASE_DIR = path.join(WEB_ROOT, targetDir);

function fileLabel(filePath) {
  const b = path.basename(filePath).replace(/\.[mc]?[tj]sx?$/, '');
  const s1 = b.replace(/(.)([A-Z][a-z]+)/g, '$1_$2');
  return s1.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function shouldSkipLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith('//')) return true;
  if (t.startsWith('*') || t.startsWith('/*')) return true;
  if (t.startsWith('import ')) return true;
  if (/^\s*(export\s+)?(type|interface|enum)\s/.test(t)) return true;
  return false;
}

function hasTCall(line) {
  return /\bt\s*\(\s*['"`]/.test(line) || /i18n\.t\s*\(/.test(line);
}

function collectTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests', 'dist', 'build'].includes(entry.name)) continue;
      if (entry.name.endsWith('.stories.tsx')) continue;
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.stories.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractChineseSegments(line) {
  const segments = [];
  let m;

  const jsxTextRe = />([\s]*[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\s\w：，。、（）()·\-—\!！？%]+?[\s]*)</g;
  while ((m = jsxTextRe.exec(line)) !== null) {
    const text = m[1].trim();
    if (text && CJK_RE.test(text)) segments.push({ text, type: 'jsx_text', full: m[0], offset: m.index, end: m.index + m[0].length });
  }

  const jsxAttrRe = /(\w+)=(["'])([\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w\s：，。、（）()·\-—\!！？%\/]*)\2/g;
  while ((m = jsxAttrRe.exec(line)) !== null) {
    segments.push({ text: m[3], type: 'jsx_attr', attr: m[1], full: m[0], offset: m.index, end: m.index + m[0].length });
  }

  const strLitRe = /(["'])((?:[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w\s：，。、（）()·\-—\!！？%\/]*))\1/g;
  while ((m = strLitRe.exec(line)) !== null) {
    if (!CJK_RE.test(m[2])) continue;
    const before = line.substring(0, m.index);
    if (/\bt\s*\(\s*$/.test(before) || /i18n\.t\s*\(\s*$/.test(before)) continue;
    const segStart = m.index;
    const segEnd = m.index + m[0].length;
    const overlaps = segments.some(s => segStart < s.end && segEnd > s.offset);
    if (overlaps) continue;
    segments.push({ text: m[2], type: 'str_lit', quote: m[1], full: m[0], offset: m.index, end: m.index + m[0].length });
  }

  return segments;
}

function generateKey(moduleName, fl, text, index) {
  const prefix = `${moduleName}.${fl}`;
  const hash = text.length <= 20
    ? text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
    : '';
  return hash ? `${prefix}.${hash}_${index}` : `${prefix}.k${index}`;
}

function loadJson(filepath) {
  try { return JSON.parse(fs.readFileSync(filepath, 'utf-8')); } catch { return {}; }
}

function saveJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function ensureI18nImport(lines) {
  const usesI18n = lines.some(l => /i18n\.t\s*\(/.test(l) && !/import/.test(l));
  const hasImport = lines.some(l => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l) || /import\s+\{\s*i18n\s*\}/.test(l));
  if (usesI18n && !hasImport) {
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) lastImport = i;
      else if (lastImport >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
    }
    if (lastImport >= 0) {
      // Check if next line is part of multi-line import (ends with { and no })
      const importLine = lines[lastImport].trim();
      if (importLine.includes('{') && !importLine.includes('}')) {
        // Find closing brace
        for (let i = lastImport + 1; i < lines.length; i++) {
          if (lines[i].includes('}')) {
            lines.splice(i + 1, 0, "import i18n from '@/i18n';");
            return true;
          }
        }
      } else {
        lines.splice(lastImport + 1, 0, "import i18n from '@/i18n';");
        return true;
      }
    }
  }
  return false;
}

function processFile(filePath, moduleName, translations) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fl = fileLabel(filePath);
  let keyCounter = 0;
  let replacedCount = 0;
  const newLines = [...lines];
  let usesI18n = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (shouldSkipLine(line) || !CJK_RE.test(line) || hasTCall(line)) continue;

    const segments = extractChineseSegments(line);
    if (segments.length === 0) continue;

    let modifiedLine = line;
    for (let j = segments.length - 1; j >= 0; j--) {
      const seg = segments[j];
      const key = generateKey(moduleName, fl, seg.text, keyCounter++);

      if (!(key in translations.zh)) {
        translations.zh[key] = seg.text;
        translations.en[key] = seg.text;
      }

      let replacement;
      if (seg.type === 'jsx_text') {
        replacement = `>{i18n.t('${key}')}<`;
      } else if (seg.type === 'jsx_attr') {
        replacement = `${seg.attr}={i18n.t('${key}')}`;
      } else if (seg.type === 'str_lit') {
        replacement = `i18n.t('${key}')`;
      }

      if (replacement) {
        modifiedLine = modifiedLine.replace(seg.full, replacement);
        replacedCount++;
        usesI18n = true;
        if (verbose) console.log(`  L${i + 1}: ${seg.text} → i18n.t('${key}')`);
      }
    }

    if (modifiedLine !== line) {
      newLines[i] = modifiedLine;
    }
  }

  if (usesI18n) {
    ensureI18nImport(newLines);
  }

  if (!dryRun && replacedCount > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
  }

  return { replacedCount, fileLabel: fl };
}

// Main
const files = collectTsxFiles(BASE_DIR);
if (files.length === 0) {
  console.log(`目录 ${BASE_DIR} 无 .tsx 文件`);
  process.exit(0);
}

const translations = { zh: {}, en: {} };
const zhNsPath = path.join(I18N_DIR, 'zh', `${moduleName}.json`);
const enNsPath = path.join(I18N_DIR, 'en', `${moduleName}.json`);
translations.zh = loadJson(zhNsPath);
translations.en = loadJson(enNsPath);

console.log(`\n📦 ${targetDir} (${files.length} 文件, namespace=${moduleName})`);

const results = [];
let totalReplaced = 0;

for (const file of files) {
  const result = processFile(file, moduleName, translations);
  if (result.replacedCount > 0) {
    results.push(result);
    totalReplaced += result.replacedCount;
    const rel = path.relative(BASE_DIR, file);
    console.log(`  ✅ ${rel}: ${result.replacedCount} 处替换`);
  }
}

if (!dryRun && totalReplaced > 0) {
  saveJson(zhNsPath, translations.zh);
  saveJson(enNsPath, translations.en);
  console.log(`  💾 翻译条目已保存: zh/${moduleName}.json, en/${moduleName}.json`);
}

console.log(`  总计: ${totalReplaced} 处替换${dryRun ? ' (DRY RUN)' : ''}`);
console.log(`\n==================================================`);
console.log(`总计替换: ${totalReplaced} 处${dryRun ? ' (DRY RUN)' : ''}`);
