/**
 * i18n 批量迁移脚本 - 安全最终版
 *
 * 策略：
 * - 使用 `import i18n from '@/i18n'` + `i18n.t('module.pagename.key')` 模式
 * - 仅处理：单行字符串字面量、简单 JSX 文本（无表达式）、模板字符串
 * - 跳过：注释、apiLogger/console 调用、已包装在 t() 内的字符串、跨行字符串
 * - 同步更新 zh/{module}.json 和 zh.json
 *
 * 用法： node scripts/i18n-batch-final.mjs <module1> [module2 ...]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHINESE_RE = /[\u4e00-\u9fff]/;

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`  [JSON-ERROR] ${filePath}: ${e.message}`);
    return {};
  }
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

// 文件名 -> 页面前缀
function fileNameToPrefix(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base
    .replace(/^Workflow/, 'workflow')
    .replace(/^Wms/, 'wms')
    .replace(/^Erp/, 'erp')
    .replace(/^Qms/, 'qms')
    .replace(/^Pm/, 'pm')
    .replace(/^Scm/, 'scm')
    .replace(/^Hrm/, 'hrm')
    .replace(/^Mes/, 'mes')
    .replace(/^Pdm/, 'pdm')
    .replace(/^Rd/, 'rd')
    .replace(/^Finance/, 'finance')
    .replace(/^Ehs/, 'ehs')
    .replace(/^Gis/, 'gis')
    .toLowerCase();
}

// 清理键名（保留中文，仅清理换行和多余空白）
function sanitizeKey(text) {
  return text
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

// 判断是否在 t() 调用内
function isInTCall(content, start) {
  const before = content.slice(Math.max(0, start - 30), start);
  return /\bt\s*\(\s*$/.test(before) || /i18n\.t\s*\(\s*$/.test(before);
}

// 判断是否在 JSX 属性上下文中（如 label='中文' 或 placeholder="中文"）
// 返回属性名，如果不是属性则返回 null
function getJsxAttrName(content, start) {
  const before = content.slice(Math.max(0, start - 80), start);
  const attrMatch = before.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*$/);
  if (attrMatch) {
    const propName = attrMatch[1];
    // 检查属性名前一个字符，确保不是表达式上下文（如 x = '...'）
    const prevIdx = before.length - propName.length - 1;
    const prevChar = prevIdx >= 0 ? before[prevIdx] : '';
    if (!/[=!<>+\-*/%&|^~?:,.([\]{}]/.test(prevChar)) {
      return propName;
    }
  }
  return null;
}

// 判断是否在 logger 调用中
function isInLoggerCall(content, start) {
  const before = content.slice(Math.max(0, start - 120), start);
  // 检查同一行内是否有 apiLogger.xxx( 或 console.xxx( 且未闭合
  const lineStart = content.lastIndexOf('\n', start) + 1;
  const linePrefix = content.slice(lineStart, start);
  if (/(apiLogger|console)\.\w+\s*\([^)]*$/.test(linePrefix)) return true;
  return false;
}

// 判断是否在注释中
function isInComment(content, start) {
  const lineStart = content.lastIndexOf('\n', start) + 1;
  const linePrefix = content.slice(lineStart, start);
  if (linePrefix.includes('//')) return true;
  // 检查块注释
  let inBlock = false;
  for (let i = 0; i < start; i++) {
    if (content[i] === '/' && content[i + 1] === '*') inBlock = true;
    else if (content[i] === '*' && content[i + 1] === '/' && inBlock) inBlock = false;
  }
  return inBlock;
}

// 判断是否在 import 语句中
function isInImport(content, start) {
  const lineStart = content.lastIndexOf('\n', start) + 1;
  const line = content.slice(lineStart, start);
  if (/^\s*import\s/.test(line) || /^\s*from\s/.test(line)) return true;
  // 检查多行 import
  let pos = start;
  while (pos > 0) {
    const ch = content[pos];
    if (ch === '\n') break;
    if (ch === ';') return false;
    pos--;
  }
  // 往上查找 import 关键字
  const searchStart = Math.max(0, start - 500);
  const segment = content.slice(searchStart, start);
  const lastImport = segment.lastIndexOf('import ');
  const lastSemi = segment.lastIndexOf(';');
  if (lastImport > lastSemi) return true;
  return false;
}

// 处理单个文件
function processFile(filePath, moduleName) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return null;

  const importLine = "import i18n from '@/i18n';";
  const hasI18nImport = content.includes(importLine) || /from\s+['"]@\/i18n['"]/.test(content);

  const prefix = fileNameToPrefix(filePath);
  const newKeys = {};
  const replacements = [];

  // === 1. 处理双引号字符串字面量（单行，含中文）===
  // [^"\\\n] 确保不跨行，不匹配未转义的引号
  const doubleQuotedRe = /"((?:[^"\\\n]|\\.)*[\u4e00-\u9fff](?:[^"\\\n]|\\.)*)"/g;
  for (const m of content.matchAll(doubleQuotedRe)) {
    const fullMatch = m[0];
    const text = m[1];
    if (!CHINESE_RE.test(text)) continue;
    if (isInComment(content, m.index)) continue;
    if (isInImport(content, m.index)) continue;
    if (isInTCall(content, m.index)) continue;
    if (isInLoggerCall(content, m.index)) continue;
    // 跳过包含 ${} 或 JSX 标签的字符串
    if (text.includes('${')) continue;
    if (text.includes('<') || text.includes('>')) continue;
    if (text.length < 1) continue;

    const key = `${prefix}.${sanitizeKey(text)}`;
    newKeys[key] = text;
    // 检查是否是 JSX 属性值（如 label="中文"），需要加花括号
    const attrName = getJsxAttrName(content, m.index);
    const replacement = attrName
      ? `{i18n.t('${moduleName}.${key}')}`
      : `i18n.t('${moduleName}.${key}')`;
    replacements.push({
      start: m.index,
      end: m.index + fullMatch.length,
      replacement,
    });
  }

  // === 2. 处理单引号字符串字面量（单行，含中文）===
  const singleQuotedRe = /'((?:[^'\\\n]|\\.)*[\u4e00-\u9fff](?:[^'\\\n]|\\.)*)'/g;
  for (const m of content.matchAll(singleQuotedRe)) {
    const fullMatch = m[0];
    const text = m[1];
    if (!CHINESE_RE.test(text)) continue;
    if (isInComment(content, m.index)) continue;
    if (isInImport(content, m.index)) continue;
    if (isInTCall(content, m.index)) continue;
    if (isInLoggerCall(content, m.index)) continue;
    if (text.includes('${')) continue;
    if (text.includes('<') || text.includes('>')) continue;
    if (text.length < 1) continue;

    const key = `${prefix}.${sanitizeKey(text)}`;
    newKeys[key] = text;
    // 检查是否是 JSX 属性值（如 label='中文'），需要加花括号
    const attrName = getJsxAttrName(content, m.index);
    const replacement = attrName
      ? `{i18n.t('${moduleName}.${key}')}`
      : `i18n.t('${moduleName}.${key}')`;
    replacements.push({
      start: m.index,
      end: m.index + fullMatch.length,
      replacement,
    });
  }

  // === 3. 处理 JSX 纯文本内容（>中文<，可跨行，不含 { } < >）===
  const jsxTextRe = />([^<>{}]*[\u4e00-\u9fff][^<>{}]*?)</g;
  for (const m of content.matchAll(jsxTextRe)) {
    const fullMatch = m[0];
    const text = m[1];
    if (!CHINESE_RE.test(text)) continue;
    const trimmed = text.replace(/^\s+|\s+$/g, '');
    if (!trimmed) continue;
    if (isInComment(content, m.index)) continue;
    // 跳过包含代码字符的内容（可能是 TypeScript 代码误匹配）
    if (/[;()=?]/.test(trimmed)) continue;
    // 跳过过长的内容（可能是代码块误匹配）
    if (trimmed.length > 100) continue;
    // 跳过包含换行且非纯文本的内容
    if (text.includes('\n') && /[a-zA-Z_][a-zA-Z0-9_]*\s*[({]/.test(trimmed)) continue;

    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    const key = `${prefix}.${sanitizeKey(trimmed)}`;
    newKeys[key] = trimmed;
    replacements.push({
      start: m.index,
      end: m.index + fullMatch.length,
      replacement: `>${leading}{i18n.t('${moduleName}.${key}')}${trailing}<`,
    });
  }

  // === 4. 处理模板字符串（反引号，含中文和 ${expr}）===
  // 先匹配所有反引号对，再筛选包含中文的
  const templateRe = /`([^`]*)`/g;
  for (const m of content.matchAll(templateRe)) {
    const fullMatch = m[0];
    const text = m[1];
    if (!CHINESE_RE.test(text)) continue;
    if (isInComment(content, m.index)) continue;
    if (isInImport(content, m.index)) continue;
    if (isInTCall(content, m.index)) continue;
    if (isInLoggerCall(content, m.index)) continue;
    // 跳过纯文本（无 ${} 的）— 由前面的字符串规则处理
    if (!text.includes('${')) continue;
    // 跳过跨行的复杂模板（可能包含嵌套结构）
    if (text.split('\n').length > 3) continue;

    // 提取所有 ${expr} 表达式
    const exprRe = /\$\{([^}]+)\}/g;
    const exprs = [];
    let textWithPlaceholders = text;
    let idx = 0;
    let match2;
    while ((match2 = exprRe.exec(text)) !== null) {
      const expr = match2[1];
      // 跳过复杂表达式（包含 { } 或换行）
      if (expr.includes('{') || expr.includes('}')) continue;
      if (expr.includes('\n')) continue;
      const placeholderName = `v${idx++}`;
      exprs.push({ expr, placeholderName });
      textWithPlaceholders = textWithPlaceholders.replace(match2[0], `{{${placeholderName}}}`);
    }

    if (exprs.length === 0) continue;
    if (!CHINESE_RE.test(textWithPlaceholders)) continue;

    const trimmed = textWithPlaceholders.replace(/^\s+|\s+$/g, '');
    if (!trimmed) continue;

    const key = `${prefix}.${sanitizeKey(trimmed)}`;
    newKeys[key] = trimmed;

    const interpArgs = exprs.map(e => `${e.placeholderName}: ${e.expr}`).join(', ');
    const replacement = `i18n.t('${moduleName}.${key}', { ${interpArgs} })`;

    replacements.push({
      start: m.index,
      end: m.index + fullMatch.length,
      replacement,
    });
  }

  if (replacements.length === 0) return null;

  // === 去重和冲突处理 ===
  // 按开始位置排序
  replacements.sort((a, b) => a.start - b.start);

  // 移除重叠的替换：保留较长的
  const filtered = [];
  for (const rep of replacements) {
    let overlaps = false;
    for (const kept of filtered) {
      // 检查是否重叠
      if (rep.start < kept.end && rep.end > kept.start) {
        const repLen = rep.end - rep.start;
        const keptLen = kept.end - kept.start;
        if (repLen > keptLen) {
          // 当前替换更长，移除已保留的
          const idx = filtered.indexOf(kept);
          filtered.splice(idx, 1);
        } else {
          // 已保留的更长，跳过当前
          overlaps = true;
          break;
        }
      }
    }
    if (!overlaps) filtered.push(rep);
  }

  // 按位置倒序应用替换（先应用替换，再添加 import，避免位置偏移）
  const sortedReps = filtered.sort((a, b) => b.start - a.start);
  for (const rep of sortedReps) {
    content = content.slice(0, rep.start) + rep.replacement + content.slice(rep.end);
  }

  // 添加 import（如果缺失）— 在替换之后添加，不影响替换位置
  if (!hasI18nImport) {
    const reactMatch = content.match(/^import React[^;]*;/m);
    if (reactMatch) {
      content = content.replace(reactMatch[0], `${reactMatch[0]}\n${importLine}`);
    } else {
      const allImports = [...content.matchAll(/^import .+;/gm)];
      if (allImports.length > 0) {
        const last = allImports[allImports.length - 1];
        const pos = last.index + last[0].length;
        content = content.slice(0, pos) + '\n' + importLine + content.slice(pos);
      } else {
        content = `${importLine}\n${content}`;
      }
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return { count: sortedReps.length, newKeys };
}

// 处理整个模块
function processModule(moduleName) {
  const modulePath = path.join(projectRoot, 'src', 'pages', moduleName);
  if (!fs.existsSync(modulePath)) {
    console.log(`  [SKIP] ${moduleName}: 目录不存在`);
    return null;
  }

  console.log(`\n=== ${moduleName} ===`);

  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.name === 'node_modules') continue;
      if (e.isDirectory()) walk(fp);
      else if (/\.tsx$/.test(e.name)) files.push(fp);
    }
  }
  walk(modulePath);

  let totalChanges = 0;
  let changedFiles = 0;
  const allNewKeys = {};

  for (const filePath of files) {
    try {
      const result = processFile(filePath, moduleName);
      if (result) {
        totalChanges += result.count;
        changedFiles++;
        Object.assign(allNewKeys, result.newKeys);
        if (result.count >= 5) {
          console.log(`  ${path.relative(projectRoot, filePath)}: ${result.count} 处`);
        }
      }
    } catch (err) {
      console.log(`  [ERROR] ${path.relative(projectRoot, filePath)}: ${err.message}`);
    }
  }

  // 更新 zh/{module}.json 和 zh.json
  if (Object.keys(allNewKeys).length > 0) {
    const moduleJsonPath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh', `${moduleName}.json`);
    const moduleObj = readJson(moduleJsonPath);

    let newCount = 0;
    for (const [k, v] of Object.entries(allNewKeys)) {
      if (!(k in moduleObj)) {
        moduleObj[k] = v;
        newCount++;
      }
    }
    writeJson(moduleJsonPath, moduleObj);

    // 同步更新 zh.json
    const zhJsonPath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh.json');
    const zhObj = readJson(zhJsonPath);
    if (!zhObj[moduleName]) zhObj[moduleName] = {};

    let zhNewCount = 0;
    for (const [k, v] of Object.entries(allNewKeys)) {
      if (!(k in zhObj[moduleName])) {
        zhObj[moduleName][k] = v;
        zhNewCount++;
      }
    }
    writeJson(zhJsonPath, zhObj);

    console.log(`  新增 key: zh/${moduleName}.json +${newCount}, zh.json +${zhNewCount}`);
  }

  console.log(`  结果: ${changedFiles}/${files.length} 文件, ${totalChanges} 处替换`);
  return { module: moduleName, files: changedFiles, totalFiles: files.length, changes: totalChanges };
}

// 主程序
const targetModules = process.argv.slice(2);
const modules = targetModules.length > 0 ? targetModules : ['workflow', 'wms', 'erp', 'qms'];

console.log('=== TOPEMS i18n 批量迁移（安全版）===');
console.log(`模块: ${modules.join(', ')}`);
console.log('策略: 单行字符串 + 简单 JSX 文本 + 模板字符串');

const results = [];
for (const mod of modules) {
  const r = processModule(mod);
  if (r) results.push(r);
}

console.log('\n=== 汇总 ===');
for (const r of results) {
  console.log(`  ${r.module}: ${r.files}/${r.totalFiles} 文件, ${r.changes} 处替换`);
}
