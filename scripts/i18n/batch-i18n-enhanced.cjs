#!/usr/bin/env node
/**
 * V222 P4-Enhanced: i18n batch replacement for template literals & complex patterns
 *
 * Handles patterns that batch-i18n-general.cjs and batch-ts-general.cjs miss:
 * - Template literals (backtick strings) with Chinese: `操作成功`
 * - Template literals with interpolation: `发现 ${count} 个异常`
 * - JSX attributes with non-CJK prefix: title='AI 文本分析'
 * - Object property values with Chinese in various formats
 * - String concatenation with Chinese
 *
 * Usage:
 *   node scripts/i18n/batch-i18n-enhanced.cjs --dir components --module components
 *   node scripts/i18n/batch-i18n-enhanced.cjs --dir pages --module pages
 *   node scripts/i18n/batch-i18n-enhanced.cjs --dir ai --module ai
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

function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests', 'dist', 'build'].includes(entry.name)) continue;
      results.push(...collectFiles(fullPath));
    } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
               !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx') &&
               !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.stories.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function loadJson(filepath) {
  try { return JSON.parse(fs.readFileSync(filepath, 'utf-8')); } catch { return {}; }
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
  return /i18n\.t\s*\(/.test(line);
}

const CJK_CHARS = '\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff';
const CJK_PUNCT = '：，。、（）()·\\-—\\!！？%／';
const CJK_CLASS = `[${CJK_CHARS}${CJK_PUNCT}]`;

function extractSegments(line) {
  const segments = [];
  let m;

  // 1. Template literals with Chinese: `中文...`
  // Match backtick strings containing Chinese
  const tplRe = /`([^`]*[${CJK_CHARS}][^`]*)`/g;
  while ((m = tplRe.exec(line)) !== null) {
    const content = m[1];
    if (!CJK_RE.test(content)) continue;
    const before = line.substring(0, m.index);
    if (/i18n\.t\s*\(\s*$/.test(before)) continue;

    // Check if it contains ${...} interpolation
    if (content.includes('${')) {
      // Split into parts: Chinese text segments and ${expr} parts
      const parts = [];
      let remaining = content;
      let offset = 0;
      const interpRe = /\$\{([^}]*)\}/g;
      let lastEnd = 0;
      let im;
      const chunks = [];
      while ((im = interpRe.exec(content)) !== null) {
        if (im.index > lastEnd) {
          chunks.push({ type: 'text', value: content.substring(lastEnd, im.index) });
        }
        chunks.push({ type: 'expr', value: im[1] });
        lastEnd = im.index + im[0].length;
      }
      if (lastEnd < content.length) {
        chunks.push({ type: 'text', value: content.substring(lastEnd) });
      }

      // Only process if there are Chinese text chunks
      const hasChinese = chunks.some(c => c.type === 'text' && CJK_RE.test(c.value));
      if (!hasChinese) continue;

      // Build replacement: concatenate i18n.t() calls and expressions
      const replacementParts = chunks.map(c => {
        if (c.type === 'expr') {
          return '${' + c.value + '}';
        }
        if (CJK_RE.test(c.value)) {
          return c.value; // Will be replaced separately
        }
        return c.value;
      });

      // For interpolated templates, replace each Chinese text chunk
      segments.push({
        type: 'template_interp',
        full: m[0],
        content: content,
        chunks: chunks,
        offset: m.index,
        end: m.index + m[0].length,
      });
    } else {
      // Simple template literal with Chinese (no interpolation)
      segments.push({
        type: 'template_simple',
        text: content,
        full: m[0],
        offset: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  // 2. String literals with Chinese that were missed (broader pattern)
  const strRe = /(['"])((?:[${CJK_CHARS}][${CJK_CHARS}\\s\\w：，。、（）()·\\-—\\!！？%\\/]*))\\1/g;
  // Use a simpler approach - match any quoted string containing CJK
  const strRe2 = new RegExp(
    `(['"])((?:[^'"\\n]*[${CJK_CHARS}][^'"\\n]*))\\1`,
    'g'
  );
  while ((m = strRe2.exec(line)) !== null) {
    if (!CJK_RE.test(m[2])) continue;
    const before = line.substring(0, m.index);
    if (/i18n\.t\s*\(\s*$/.test(before)) continue;
    if (/\bt\s*\(\s*$/.test(before)) continue;

    // Check if this overlaps with a template literal segment
    const segStart = m.index;
    const segEnd = m.index + m[0].length;
    const overlaps = segments.some(s => segStart < s.end && segEnd > s.offset);
    if (overlaps) continue;

    // Check if this string literal is a JSX attribute value (preceded by word=)
    const jsxAttrMatch = before.match(/(\w+)=$/);
    if (jsxAttrMatch) {
      segments.push({
        type: 'jsx_attr',
        attr: jsxAttrMatch[1],
        text: m[2],
        quote: m[1],
        full: m[0],
        offset: m.index,
        end: m.index + m[0].length,
      });
      continue;
    }

    segments.push({
      type: 'str_lit',
      text: m[2],
      quote: m[1],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }

  // 3. JSX text between > and < (single line, broader)
  const jsxTextRe = new RegExp(
    `>([\\s]*[${CJK_CHARS}][${CJK_CHARS}\\s\\w：，。、（）()·\\-—\\!！？%\\.\\,]+?[\\s]*)<`,
    'g'
  );
  while ((m = jsxTextRe.exec(line)) !== null) {
    const text = m[1].trim();
    if (!text || !CJK_RE.test(text)) continue;

    const segStart = m.index;
    const segEnd = m.index + m[0].length;
    const overlaps = segments.some(s => segStart < s.end && segEnd > s.offset);
    if (overlaps) continue;

    segments.push({
      type: 'jsx_text',
      text: text,
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }

  // 4. JSX attributes with Chinese: attr="中文" or attr='中文' (including non-CJK prefix)
  const jsxAttrRe = /(\w+)=(["'])((?:[^"'\n]*[CJK_CHARS][^"'\n]*))\2/g;
  const jsxAttrReParsed = new RegExp(
    `(\\w+)=(["'])((?:[^"'\\n]*[${CJK_CHARS}][^"'\\n]*))\\2`,
    'g'
  );
  while ((m = jsxAttrReParsed.exec(line)) !== null) {
    const before = line.substring(0, m.index);
    if (/i18n\.t\s*\(\s*$/.test(before)) continue;

    const segStart = m.index;
    const segEnd = m.index + m[0].length;
    const overlaps = segments.some(s => segStart < s.end && segEnd > s.offset);
    if (overlaps) continue;

    segments.push({
      type: 'jsx_attr',
      attr: m[1],
      text: m[3],
      quote: m[2],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }

  // Sort by offset descending for safe replacement
  segments.sort((a, b) => b.offset - a.offset);
  return segments;
}

function generateKey(moduleName, fl, text, index) {
  const prefix = `${moduleName}.${fl}`;
  const hash = text.length <= 20
    ? text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
    : '';
  return hash ? `${prefix}.${hash}_${index}` : `${prefix}.k${index}`;
}

function ensureI18nImport(lines) {
  const usesI18n = lines.some(l => /i18n\.t\s*\(/.test(l) && !/import/.test(l));
  const hasImport = lines.some(l =>
    /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l) ||
    /import\s+\{\s*i18n\s*\}/.test(l)
  );
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
  let usesI18n = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (shouldSkipLine(line) || !CJK_RE.test(line)) continue;

    const segments = extractSegments(line);
    if (segments.length === 0) continue;

    let modifiedLine = line;
    for (const seg of segments) {
      if (seg.type === 'template_simple') {
        const key = generateKey(moduleName, fl, seg.text, keyCounter++);
        if (!(key in translations.zh)) {
          translations.zh[key] = seg.text;
          translations.en[key] = seg.text;
        }
        // Replace `中文` with i18n.t('key')
        modifiedLine = modifiedLine.replace(seg.full, `i18n.t('${key}')`);
        replacedCount++;
        usesI18n = true;
        if (verbose) console.log(`  L${i+1}: \`${seg.text}\` -> i18n.t('${key}')`);
      } else if (seg.type === 'template_interp') {
        // For template literals with interpolation, replace Chinese text chunks
        let newContent = '';
        for (const chunk of seg.chunks) {
          if (chunk.type === 'expr') {
            newContent += '${' + chunk.value + '}';
          } else if (CJK_RE.test(chunk.value)) {
            const key = generateKey(moduleName, fl, chunk.value.trim(), keyCounter++);
            if (!(key in translations.zh)) {
              translations.zh[key] = chunk.value.trim();
              translations.en[key] = chunk.value.trim();
            }
            newContent += '${i18n.t(\'' + key + '\')}';
            replacedCount++;
            usesI18n = true;
            if (verbose) console.log(`  L${i+1}: chunk \`${chunk.value}\` -> i18n.t('${key}')`);
          } else {
            newContent += chunk.value;
          }
        }
        modifiedLine = modifiedLine.replace(seg.full, '`' + newContent + '`');
      } else if (seg.type === 'str_lit') {
        const key = generateKey(moduleName, fl, seg.text, keyCounter++);
        if (!(key in translations.zh)) {
          translations.zh[key] = seg.text;
          translations.en[key] = seg.text;
        }
        modifiedLine = modifiedLine.replace(seg.full, `i18n.t('${key}')`);
        replacedCount++;
        usesI18n = true;
        if (verbose) console.log(`  L${i+1}: "${seg.text}" -> i18n.t('${key}')`);
      } else if (seg.type === 'jsx_text') {
        const key = generateKey(moduleName, fl, seg.text, keyCounter++);
        if (!(key in translations.zh)) {
          translations.zh[key] = seg.text;
          translations.en[key] = seg.text;
        }
        modifiedLine = modifiedLine.replace(seg.full, `>{i18n.t('${key}')}<`);
        replacedCount++;
        usesI18n = true;
        if (verbose) console.log(`  L${i+1}: >${seg.text}< -> >{i18n.t('${key}')}<`);
      } else if (seg.type === 'jsx_attr') {
        const key = generateKey(moduleName, fl, seg.text, keyCounter++);
        if (!(key in translations.zh)) {
          translations.zh[key] = seg.text;
          translations.en[key] = seg.text;
        }
        modifiedLine = modifiedLine.replace(seg.full, `${seg.attr}={i18n.t('${key}')}`);
        replacedCount++;
        usesI18n = true;
        if (verbose) console.log(`  L${i+1}: ${seg.attr}="${seg.text}" -> ${seg.attr}={i18n.t('${key}')}`);
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
const files = collectFiles(BASE_DIR);
if (files.length === 0) {
  console.log(`目录 ${BASE_DIR} 无 .ts/.tsx 文件`);
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
