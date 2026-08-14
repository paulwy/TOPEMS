#!/usr/bin/env node
/**
 * V221 P3: Schema i18n batch replacement
 *
 * Processes .ts schema files (not .tsx) that contain hardcoded Chinese
 * in object literal properties (title, description, label, placeholder, etc.)
 * Replaces with i18n.t() calls and adds import.
 *
 * Usage:
 *   node scripts/i18n/batch-schema-i18n.cjs --module mes           # Process single module
 *   node scripts/i18n/batch-schema-i18n.cjs --module mes,qms       # Process multiple modules
 *   node scripts/i18n/batch-schema-i18n.cjs --module mes --dry     # Dry run
 *   node scripts/i18n/batch-schema-i18n.cjs --module mes --verbose  # Verbose
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const SCHEMAS_DIR = path.join(WEB_ROOT, 'schemas');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');

const args = process.argv.slice(2);
const moduleIdx = args.indexOf('--module');
const targetModules = moduleIdx !== -1 && args[moduleIdx + 1]
  ? args[moduleIdx + 1].split(',')
  : [];
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]/;

const SKIP_FILES = ['index.ts'];

function fileLabel(filePath) {
  const b = path.basename(filePath).replace('.ts', '');
  const s1 = b.replace(/(.)([A-Z][a-z]+)/g, '$1_$2');
  return s1.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function collectTsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !SKIP_FILES.includes(entry.name)) {
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
  // Match: '中文' or "中文" (full quoted strings that contain Chinese)
  const strRe = /(['"])((?:[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\s\w：，。、（）()·\-—\!！？%\/]*))\1/g;
  let m;
  while ((m = strRe.exec(line)) !== null) {
    if (!CJK_RE.test(m[2])) continue;
    // Skip if already inside i18n.t()
    const before = line.substring(0, m.index);
    if (/i18n\.t\s*\(\s*$/.test(before) || /\bt\s*\(\s*$/.test(before)) continue;
    // Skip if it's a key path like 'mes.xxx'
    if (m[2].includes('.') && !CJK_RE.test(m[2].split('.')[0])) continue;
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
  const hash = text.length <= 20
    ? text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
    : '';
  return hash ? `${prefix}.${hash}_${index}` : `${prefix}.k${index}`;
}

function ensureImport(lines) {
  const hasImport = lines.some(l => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l) || /import\s+\{\s*i18n\s*\}\s+from/.test(l));
  const usesI18n = lines.some(l => /i18n\.t\s*\(/.test(l) && !/import/.test(l));
  if (usesI18n && !hasImport) {
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) lastImport = i;
      else if (lastImport >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
    }
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, "import i18n from '@/i18n';");
      return true;
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
      if (verbose) {
        console.log(`  L${i + 1}: ${seg.text} → i18n.t('${key}')`);
      }
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

function processModule(moduleName) {
  const moduleDir = path.join(SCHEMAS_DIR, moduleName);
  if (!fs.existsSync(moduleDir)) {
    console.log(`模块 ${moduleName} schema 目录不存在: ${moduleDir}`);
    return { module: moduleName, totalReplaced: 0, files: [] };
  }

  const files = collectTsFiles(moduleDir);
  if (files.length === 0) {
    console.log(`模块 ${moduleName} schema: 无 .ts 文件`);
    return { module: moduleName, totalReplaced: 0, files: [] };
  }

  const translations = { zh: {}, en: {} };
  const zhNsPath = path.join(I18N_DIR, 'zh', `${moduleName}.json`);
  const enNsPath = path.join(I18N_DIR, 'en', `${moduleName}.json`);
  translations.zh = loadJson(zhNsPath);
  translations.en = loadJson(enNsPath);

  console.log(`\n📦 Schema 模块 ${moduleName} (${files.length} 文件)`);

  const results = [];
  let totalReplaced = 0;

  for (const file of files) {
    const result = processFile(file, moduleName, translations);
    if (result.replacedCount > 0) {
      results.push(result);
      totalReplaced += result.replacedCount;
      console.log(`  ✅ ${moduleName}/${result.fileLabel}: ${result.replacedCount} 处替换`);
    }
  }

  if (!dryRun && totalReplaced > 0) {
    saveJson(zhNsPath, translations.zh);
    saveJson(enNsPath, translations.en);
    console.log(`  💾 翻译条目已保存: zh/${moduleName}.json, en/${moduleName}.json`);
  }

  console.log(`  总计: ${totalReplaced} 处替换${dryRun ? ' (DRY RUN)' : ''}`);
  return { module: moduleName, totalReplaced, files: results };
}

let grandTotal = 0;
const allResults = [];

for (const mod of targetModules) {
  const result = processModule(mod);
  allResults.push(result);
  grandTotal += result.totalReplaced;
}

console.log(`\n==================================================`);
console.log(`总计替换: ${grandTotal} 处${dryRun ? ' (DRY RUN)' : ''}`);
