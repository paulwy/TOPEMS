#!/usr/bin/env node
/**
 * i18n 批量硬编码中文替换脚本 (V219)
 *
 * 功能：
 * 1. 扫描指定模块的 .tsx 文件中的硬编码中文
 * 2. 为每个中文字符串生成 i18n key
 * 3. 添加翻译条目到 zh/en 命名空间 JSON 文件
 * 4. 将硬编码中文替换为 t() 调用
 *
 * 用法：
 *   node scripts/i18n/batch-i18n-replace.cjs --module asset           # 处理单个模块
 *   node scripts/i18n/batch-i18n-replace.cjs --module asset,oa       # 处理多个模块
 *   node scripts/i18n/batch-i18n-replace.cjs --module asset --dry    # 试运行（不修改文件）
 *   node scripts/i18n/batch-i18n-replace.cjs --module asset --verbose # 详细输出
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');

const args = process.argv.slice(2);
const moduleIdx = args.indexOf('--module');
const targetModules = moduleIdx !== -1 && args[moduleIdx + 1]
  ? args[moduleIdx + 1].split(',')
  : [];
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]/;

function fileLabel(filePath) {
  const b = path.basename(filePath).replace('.tsx', '');
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
  if (/^\s*(export\s+)?(const|let|var)\s+\w+\s*[:=]\s*(React\.|VFC|FC|FunctionComponent)/.test(t)) return true;
  return false;
}

function hasTCall(line) {
  return /\bt\s*\(\s*['"`]/.test(line) || /i18n\.t\s*\(/.test(line) || /tpl\s*\(/.test(line);
}

function collectTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests', '.stories.tsx'].includes(entry.name)) continue;
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.stories.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractChineseSegments(line) {
  const segments = [];
  // JSX text: >中文<
  let m;
  const jsxTextRe = />([\s]*[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\s\w：，。、（）()·\-—\!！？%]+?[\s]*)</g;
  while ((m = jsxTextRe.exec(line)) !== null) {
    const text = m[1].trim();
    if (text && CJK_RE.test(text)) segments.push({ text, type: 'jsx_text', full: m[0], offset: m.index, end: m.index + m[0].length });
  }
  // JSX attribute: label="中文" or title='中文' (single or double quotes)
  const jsxAttrRe = /(\w+)=(["'])([\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w\s：，。、（）()·\-—\!！？%\/]*)\2/g;
  while ((m = jsxAttrRe.exec(line)) !== null) {
    segments.push({ text: m[3], type: 'jsx_attr', attr: m[1], full: m[0], offset: m.index, end: m.index + m[0].length });
  }
  // String literal in function call/assignment: '中文' or "中文"
  // Skip segments that overlap with JSX attribute matches (already captured above)
  const strLitRe = /(["'])((?:[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w\s：，。、（）()·\-—\!！？%\/]*))\1/g;
  while ((m = strLitRe.exec(line)) !== null) {
    if (!CJK_RE.test(m[2])) continue;
    // Skip if inside t() call
    const before = line.substring(0, m.index);
    if (/\bt\s*\(\s*$/.test(before) || /i18n\.t\s*\(\s*$/.test(before) || /tpl\s*\(\s*$/.test(before)) continue;
    // Skip if overlaps with an already-found JSX attribute segment
    const segStart = m.index;
    const segEnd = m.index + m[0].length;
    const overlaps = segments.some(s => segStart < s.end && segEnd > s.offset);
    if (overlaps) continue;
    segments.push({ text: m[2], type: 'str_lit', quote: m[1], full: m[0], offset: m.index, end: m.index + m[0].length });
  }
  return segments;
}

function generateKey(moduleName, fileLabel, text, index) {
  const prefix = `${moduleName}.${fileLabel}`;
  const hash = text.length <= 20
    ? text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
    : '';
  return hash ? `${prefix}.${hash}_${index}` : `${prefix}.k${index}`;
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

function processFile(filePath, moduleName, translations, dryRun) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fl = fileLabel(filePath);
  const relativePath = path.relative(PAGES_DIR, filePath);
  let keyCounter = 0;
  let replacedCount = 0;
  const newLines = [...lines];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (shouldSkipLine(line) || !CJK_RE.test(line) || hasTCall(line)) continue;

    const segments = extractChineseSegments(line);
    if (segments.length === 0) continue;

    let modifiedLine = line;
    // Process segments in reverse order to preserve offsets
    for (let j = segments.length - 1; j >= 0; j--) {
      const seg = segments[j];
      const key = generateKey(moduleName, fl, seg.text, keyCounter++);

      // Add to translations
      if (!(key in translations.zh)) {
        translations.zh[key] = seg.text;
        translations.en[key] = seg.text; // placeholder, to be translated
      }

      // Build replacement
      let replacement;
      if (seg.type === 'jsx_text') {
        replacement = `>{t('${key}')}<`;
      } else if (seg.type === 'jsx_attr') {
        replacement = `${seg.attr}={t('${key}')}`;
      } else if (seg.type === 'str_lit') {
        replacement = `t('${key}')`;
      }

      if (replacement) {
        modifiedLine = modifiedLine.replace(seg.full, replacement);
        replacedCount++;
        if (verbose) {
          console.log(`  L${i + 1}: ${seg.text} → t('${key}')`);
        }
      }
    }

    if (modifiedLine !== line) {
      newLines[i] = modifiedLine;
    }
  }

  // Check if useTranslation hook needs to be added
  const hasHook = content.includes('useTranslation');
  let hookAdded = false;
  if (!hasHook && replacedCount > 0) {
    // Only add hook if file has a React component (not just adapter/utility code)
    // Look for export default function, export const Component, or function Component patterns
    const componentIdx = newLines.findIndex(l =>
      /((export\s+)?(const|function)\s+\w+\s*[=:<]|export\s+default\s+function)/.test(l) &&
      !l.includes('import') &&
      !l.includes('createCrudPageAdapter') &&
      !l.includes('createAdapter')
    );

    if (componentIdx !== -1) {
      // Add import after the last import line
      const lastImportIdx = newLines.map((l, i) => l.trim().startsWith('import') ? i : -1).filter(i => i >= 0).pop();
      if (lastImportIdx !== undefined && lastImportIdx >= 0) {
        newLines.splice(lastImportIdx + 1, 0, `import { useTranslation } from 'react-i18next';`);
      }
      // Find the opening brace of the component body (not a function call)
      let braceIdx = -1;
      for (let i = componentIdx; i < newLines.length; i++) {
        const l = newLines[i];
        // Look for opening brace that's part of a function body, not an object literal
        if (/\{/.test(l) && !/=\s*\{/.test(l) && !/\(.*\{/.test(l)) {
          braceIdx = i;
          break;
        }
        // Handle arrow functions: const X = () => {
        if (/=>\s*\{/.test(l)) {
          braceIdx = i;
          break;
        }
      }
      if (braceIdx !== -1) {
        newLines.splice(braceIdx + 1, 0, `  const { t } = useTranslation('${moduleName}');`);
        hookAdded = true;
      }
    }
  }

  if (!dryRun && replacedCount > 0) {
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return { replacedCount, hookAdded, fileLabel: fl };
}

function processModule(moduleName) {
  const moduleDir = path.join(PAGES_DIR, moduleName);
  if (!fs.existsSync(moduleDir)) {
    console.log(`模块 ${moduleName} 目录不存在: ${moduleDir}`);
    return { module: moduleName, totalReplaced: 0, files: [] };
  }

  const files = collectTsxFiles(moduleDir);
  if (files.length === 0) {
    console.log(`模块 ${moduleName}: 无 .tsx 文件`);
    return { module: moduleName, totalReplaced: 0, files: [] };
  }

  const translations = { zh: {}, en: {} };

  // Load existing namespace translations
  const zhNsPath = path.join(I18N_DIR, 'zh', `${moduleName}.json`);
  const enNsPath = path.join(I18N_DIR, 'en', `${moduleName}.json`);
  const existingZh = loadJson(zhNsPath);
  const existingEn = loadJson(enNsPath);
  translations.zh = existingZh;
  translations.en = existingEn;

  console.log(`\n📦 模块 ${moduleName} (${files.length} 文件)`);

  const results = [];
  let totalReplaced = 0;

  for (const file of files) {
    const result = processFile(file, moduleName, translations, dryRun);
    if (result.replacedCount > 0) {
      results.push({ file: path.relative(PAGES_DIR, file), ...result });
      totalReplaced += result.replacedCount;
      console.log(`  ${result.replacedCount > 0 ? '✅' : '⏭️'} ${path.relative(PAGES_DIR, file)}: ${result.replacedCount} 处替换${result.hookAdded ? ' (+hook)' : ''}`);
    }
  }

  // Save updated translations
  if (!dryRun && totalReplaced > 0) {
    saveJson(zhNsPath, translations.zh);
    saveJson(enNsPath, translations.en);
    console.log(`  💾 翻译条目已保存: zh/${moduleName}.json, en/${moduleName}.json`);
  }

  console.log(`  总计: ${totalReplaced} 处替换${dryRun ? ' (DRY RUN)' : ''}`);
  return { module: moduleName, totalReplaced, files: results, translations };
}

// Main
if (targetModules.length === 0) {
  console.error('用法: node scripts/i18n/batch-i18n-replace.cjs --module <module_name>[,<module_name>] [--dry] [--verbose]');
  process.exit(1);
}

console.log(`${dryRun ? '🔍 试运行' : '🚀 执行'} i18n 批量替换`);
console.log(`模块: ${targetModules.join(', ')}`);
console.log(`基础目录: ${PAGES_DIR}`);

let grandTotal = 0;
for (const mod of targetModules) {
  const result = processModule(mod.trim());
  grandTotal += result.totalReplaced;
}

console.log(`\n${'='.repeat(50)}`);
console.log(`总计替换: ${grandTotal} 处${dryRun ? ' (DRY RUN)' : ''}`);
