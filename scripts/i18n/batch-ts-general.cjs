#!/usr/bin/env node
/**
 * V222 P4: General-purpose .ts file i18n batch replacement
 *
 * Processes .ts files (non-tsx) in any directory. Uses i18n.t() for all replacements.
 *
 * Usage:
 *   node scripts/i18n/batch-ts-general.cjs --dir modules --module shared
 *   node scripts/i18n/batch-ts-general.cjs --dir utils --module shared
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
  const b = path.basename(filePath).replace(/\.ts$/, '');
  const s1 = b.replace(/(.)([A-Z][a-z]+)/g, '$1_$2');
  return s1.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function collectTsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests', 'dist', 'build'].includes(entry.name)) continue;
      results.push(...collectTsFiles(fullPath));
    } else if (
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.d.ts') &&
      entry.name !== 'index.ts'
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

function loadJson(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return {};
  }
}

function saveJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function shouldSkipLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith('//')) return true;
  if (t.startsWith('*') || t.startsWith('/*')) return true;
  if (t.startsWith('import ')) return true;
  return false;
}

function hasI18nT(line) {
  return /i18n\.t\s*\(/.test(line) || /\bt\s*\(\s*['"`]/.test(line);
}

function extractChineseStrings(line) {
  const segments = [];
  const strRe =
    /(['"])((?:[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\s\w：，。、（）()·\-—\!！？%\/]*))\1/g;
  let m;
  while ((m = strRe.exec(line)) !== null) {
    if (!CJK_RE.test(m[2])) continue;
    const before = line.substring(0, m.index);
    if (/i18n\.t\s*\(\s*$/.test(before) || /\bt\s*\(\s*$/.test(before)) continue;
    segments.push({
      text: m[2],
      quote: m[1],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  return segments;
}

function generateKey(moduleName, fl, text, index) {
  const prefix = `${moduleName}.${fl}`;
  const hash =
    text.length <= 20
      ? text
          .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase()
      : '';
  return hash ? `${prefix}.${hash}_${index}` : `${prefix}.k${index}`;
}

function ensureImport(lines) {
  const hasImport = lines.some((l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));
  const usesI18n = lines.some((l) => /i18n\.t\s*\(/.test(l) && !/import/.test(l));
  if (usesI18n && !hasImport) {
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) lastImport = i;
      else if (lastImport >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
    }
    if (lastImport >= 0) {
      const importLine = lines[lastImport].trim();
      if (importLine.includes('{') && !importLine.includes('}')) {
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
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (shouldSkipLine(line) || !CJK_RE.test(line) || hasI18nT(line)) continue;

    const segments = extractChineseStrings(line);
    if (segments.length === 0) continue;

    let modifiedLine = line;
    for (let j = segments.length - 1; j >= 0; j--) {
      const seg = segments[j];
      const key = generateKey(moduleName, fl, seg.text, keyCounter++);
      if (!(key in translations.zh)) {
        translations.zh[key] = seg.text;
        translations.en[key] = seg.text;
      }
      modifiedLine = modifiedLine.replace(seg.full, `i18n.t('${key}')`);
      replacedCount++;
    }

    if (modifiedLine !== line) {
      newLines[i] = modifiedLine;
      modified = true;
    }
  }

  if (modified) {
    ensureImport(newLines);
    if (!dryRun) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    }
  }

  return { replacedCount, fileLabel: fl };
}

const files = collectTsFiles(BASE_DIR);
if (files.length === 0) {
  console.log(`目录 ${BASE_DIR} 无 .ts 文件`);
  process.exit(0);
}

const translations = { zh: {}, en: {} };
const zhNsPath = path.join(I18N_DIR, 'zh', `${moduleName}.json`);
const enNsPath = path.join(I18N_DIR, 'en', `${moduleName}.json`);
translations.zh = loadJson(zhNsPath);
translations.en = loadJson(enNsPath);

console.log(`\n📦 ${targetDir}/*.ts (${files.length} 文件, namespace=${moduleName})`);

let totalReplaced = 0;

for (const file of files) {
  const result = processFile(file, moduleName, translations);
  if (result.replacedCount > 0) {
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
