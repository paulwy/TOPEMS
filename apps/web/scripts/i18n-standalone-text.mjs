/**
 * Fix standalone JSX text lines: lines that are ONLY Chinese text (with whitespace).
 * These are JSX text content between tags on separate lines.
 * Example:
 *   <Typography>
 *     样品总数
 *   </Typography>
 * →
 *   <Typography>
 *     {i18n.t('lims.samplereceivepage.text_abc123')}
 *   </Typography>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHINESE_RE = /[\u4e00-\u9fff]/;

function loadJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return {}; } }
function saveJson(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n', 'utf-8'); }

function textToKey(text) {
  const sanitized = text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < sanitized.length; i++) {
    hash = ((hash << 5) - hash) + sanitized.charCodeAt(i);
    hash = hash & hash;
  }
  return `text_${(hash >>> 0).toString(16).padStart(8, '0').slice(0, 6)}`;
}

function fileNameToPrefix(filePath) {
  const base = path.basename(filePath).replace(/\.tsx?$/, '');
  return base
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/_/g, '');
}

/** Also fix template literals with ${} expressions and Chinese. */
function fixTemplateLiterals(content, moduleName, pageKey, jsonKeys, fnName) {
  const lines = content.split('\n');
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!CHINESE_RE.test(line)) continue;

    // Match template literals with ${} and Chinese: `text ${expr} text`
    const templateRe = /`([^`\n]*[\u4e00-\u9fff][^`\n]*)`/g;
    for (const m of line.matchAll(templateRe)) {
      const text = m[1];
      if (!CHINESE_RE.test(text)) continue;

      // Extract ${} expressions
      const exprParts = [];
      let displayText = text;
      const exprRe = /\$\{([^}]+)\}/g;
      let exprMatch;
      let idx = 0;
      while ((exprMatch = exprRe.exec(text)) !== null) {
        exprParts.push(exprMatch[1]);
        displayText = displayText.replace(exprMatch[0], `{{arg${idx}}}`);
        idx++;
      }

      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey]) jsonKeys[pageKey] = {};
      if (!jsonKeys[pageKey][key]) {
        jsonKeys[pageKey][key] = displayText;
      }

      // Build the i18n.t call with interpolation params
      if (exprParts.length > 0) {
        const params = exprParts.map((e, i) => `arg${i}: ${e}`).join(', ');
        const newText = `${fnName}('${fullKey}', { ${params} })`;
        line = line.replace(m[0], newText);
      } else {
        // No expressions, just replace
        line = line.replace(m[0], `${fnName}('${fullKey}')`);
      }
      changes++;
    }

    // Match standalone string literals with Chinese that weren't caught
    // '保存中...' or "加载仪器详情失败"
    const strRe = /['"]([^'"\n<>{}]*[\u4e00-\u9fff][^'"\n<>{}]*)['"]/g;
    for (const m of line.matchAll(strRe)) {
      const text = m[1];
      if (!CHINESE_RE.test(text)) continue;

      // Skip if it's an object key
      const afterMatch = line.slice(m.index + m[0].length);
      if (/^\s*:/.test(afterMatch)) continue;

      // Skip if it's a comparison value (=== or !==)
      const beforeMatch = line.slice(0, m.index);
      if (/===?\s*$/.test(beforeMatch) || /!==?\s*$/.test(beforeMatch)) continue;

      // Skip if already inside i18n.t() or t()
      if (/i18n\.t\s*\(\s*$/.test(beforeMatch) || /\bt\s*\(\s*$/.test(beforeMatch)) continue;
      if (/=\s*$/.test(beforeMatch)) continue; // JSX attribute (handled by main script)

      // Skip if it's a filter/map callback comparison
      if (/\.conclusion\s*===?\s*$/.test(beforeMatch)) continue;
      if (/\.status\s*===?\s*$/.test(beforeMatch)) continue;

      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey]) jsonKeys[pageKey] = {};
      if (!jsonKeys[pageKey][key]) {
        jsonKeys[pageKey][key] = text;
      }

      line = line.slice(0, m.index) + `${fnName}('${fullKey}')` + line.slice(m.index + m[0].length);
      changes++;
    }

    lines[i] = line;
  }

  return { lines: lines.join('\n'), changes };
}

// Comment translations for remaining comments
const commentTranslations = {
  'Sidebar - 关联检验任务': 'Sidebar - Related inspection tasks',
  'Sidebar - 检验进度': 'Sidebar - Inspection progress',
  'Sections - 检验统计': 'Sections - Inspection statistics',
  'Sections - 检验记录': 'Sections - Inspection records',
  'Sidebar - 检验记录': 'Sidebar - Inspection records',
};

function translateComment(text) {
  const trimmed = text.trim();
  if (commentTranslations[trimmed]) return commentTranslations[trimmed];
  let result = text;
  for (const [zh, en] of Object.entries(commentTranslations)) {
    if (result.includes(zh)) result = result.replaceAll(zh, en);
  }
  return result;
}

function processFile(filePath, moduleName, jsonKeys) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return 0;

  const lines = content.split('\n');
  const prefix = fileNameToPrefix(filePath);
  const pageKey = prefix.replace(/_/g, '');
  if (!jsonKeys[pageKey]) jsonKeys[pageKey] = {};

  const hasUseTranslation = /useTranslation/.test(content);
  const fnName = hasUseTranslation ? 't' : 'i18n.t';

  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!CHINESE_RE.test(line)) continue;

    let newLine = line;

    // 1. Fix standalone JSX text: line is ONLY Chinese text (with whitespace)
    // Example: "                  样品总数"
    if (/^\s*[\u4e00-\u9fff\s:：、]+$/.test(line) && line.trim().length > 1) {
      const text = line.trim();
      const leadingSpaces = line.match(/^\s*/)[0];
      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) jsonKeys[pageKey][key] = text;
      newLine = `${leadingSpaces}{${fnName}('${fullKey}')}`;
      changes++;
    }

    // 2. Fix standalone JSX text with trailing colon: "任务编号:"
    if (/^\s*[\u4e00-\u9fff]+:\s*$/.test(line)) {
      const text = line.trim().replace(/:\s*$/, '');
      const leadingSpaces = line.match(/^\s*/)[0];
      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) jsonKeys[pageKey][key] = text;
      newLine = `${leadingSpaces}{${fnName}('${fullKey}')}:`;
      changes++;
    }

    // 3. Fix inline JSX text with colon: "任务编号: {task.task_no}"
    const inlineTextRe = /(?<=[>])\s*([\u4e00-\u9fff][\u4e00-\u9fff\s:：、]*):\s/;
    const inlineMatch = line.match(inlineTextRe);
    if (inlineMatch && inlineMatch[1]) {
      const text = inlineMatch[1].trim();
      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) jsonKeys[pageKey][key] = text;
      newLine = newLine.replace(inlineTextRe, ` {${fnName}('${fullKey}')}: `);
      changes++;
    }

    // 4. Translate comments
    const commentMatch = line.match(/^(\s*)(\/\/\s*)(.+)$/);
    if (commentMatch && CHINESE_RE.test(commentMatch[3])) {
      const translated = translateComment(commentMatch[3]);
      if (translated !== commentMatch[3] && !CHINESE_RE.test(translated)) {
        newLine = commentMatch[1] + commentMatch[2] + translated;
        changes++;
      }
    }

    // 5. Fix "保存中..." and similar string literals in JSX expressions
    // {updateMutation.isPending ? '保存中...' : ...}
    const pendingStrRe = /'保存中\.\.\.'/g;
    if (pendingStrRe.test(newLine)) {
      const key = textToKey('保存中...');
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) jsonKeys[pageKey][key] = '保存中...';
      newLine = newLine.replace(pendingStrRe, `${fnName}('${fullKey}')`);
      changes++;
    }

    // 6. Fix "确认完成", "取消", "保存" etc. when they're standalone JSX text
    // Already handled by rule 1 if they're on their own line

    // 7. Fix Chinese in confirm() calls
    const confirmRe = /confirm\(`([^`]*[\u4e00-\u9fff][^`]*)`\)/g;
    for (const m of newLine.matchAll(confirmRe)) {
      const text = m[1];
      const exprParts = [];
      let displayText = text;
      const exprRe = /\$\{([^}]+)\}/g;
      let exprMatch;
      let idx = 0;
      while ((exprMatch = exprRe.exec(text)) !== null) {
        exprParts.push(exprMatch[1]);
        displayText = displayText.replace(exprMatch[0], `{{arg${idx}}}`);
        idx++;
      }
      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) jsonKeys[pageKey][key] = displayText;
      if (exprParts.length > 0) {
        const params = exprParts.map((e, i) => `arg${i}: ${e}`).join(', ');
        newLine = newLine.replace(m[0], `confirm(${fnName}('${fullKey}', { ${params} }))`);
      } else {
        newLine = newLine.replace(m[0], `confirm(${fnName}('${fullKey}'))`);
      }
      changes++;
    }

    lines[i] = newLine;
  }

  // Now fix template literals and remaining string literals
  let result = lines.join('\n');
  const tlResult = fixTemplateLiterals(result, moduleName, pageKey, jsonKeys, fnName);
  if (tlResult.changes > 0) {
    result = tlResult.lines;
    changes += tlResult.changes;
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, result, 'utf-8');
  }
  return changes;
}

// Main
const modules = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['lims', 'ehs', 'rd', 'iam'];
console.log('=== Standalone JSX Text & Template Literal Fix ===\n');

let total = 0;
for (const mod of modules) {
  const modulePath = path.join(projectRoot, 'src', 'pages', mod);
  if (!fs.existsSync(modulePath)) continue;
  const jsonPath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh', `${mod}.json`);
  const jsonKeys = loadJson(jsonPath);
  let modTotal = 0;
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp);
      else if (/\.tsx?$/.test(e.name)) modTotal += processFile(fp, mod, jsonKeys);
    }
  }
  walk(modulePath);
  saveJson(jsonPath, jsonKeys);
  console.log(`[${mod}] ${modTotal} fixes`);
  total += modTotal;
}
console.log(`\nTotal: ${total} fixes`);
