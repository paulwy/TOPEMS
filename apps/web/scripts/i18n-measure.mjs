/**
 * i18n 中文硬编码测量脚本
 *
 * 统计不在 i18n.t() 调用内的中文硬编码数量。
 * 排除：注释、logger 调用、import 语句、i18n.t('...中文...') 的 key 部分
 *
 * 用法： node scripts/i18n-measure.mjs <module1> [module2 ...]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHINESE_RE = /[\u4e00-\u9fff]/g;

// 判断是否在注释中
function getLineContext(content, pos) {
  const lineStart = content.lastIndexOf('\n', pos) + 1;
  const lineEnd = content.indexOf('\n', pos);
  return {
    lineStart,
    lineEnd: lineEnd === -1 ? content.length : lineEnd,
    linePrefix: content.slice(lineStart, pos),
    line: content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd),
  };
}

function isInBlockComment(content, pos) {
  let inBlock = false;
  for (let i = 0; i < pos; i++) {
    if (content[i] === '/' && content[i + 1] === '*') inBlock = true;
    else if (content[i] === '*' && content[i + 1] === '/' && inBlock) inBlock = false;
  }
  return inBlock;
}

// 找到包含 pos 的字符串字面量（单引号/双引号/反引号）的范围
// 返回 {start, end, quote} 或 null
function findStringLiteral(content, pos) {
  // 简单查找：从 pos 向前找最近的未配对引号
  let i = pos;
  // 向前找开始引号
  let start = -1;
  let quote = '';
  let escaped = false;
  for (let j = pos; j >= 0; j--) {
    const c = content[j];
    if (c === '\n' && start === -1) {
      // 单行字符串不能跨行；但模板字符串可以
      // 暂时只处理同行
    }
    if ((c === '"' || c === "'" || c === '`') && !escaped) {
      // 检查转义
      let backslashCount = 0;
      let k = j - 1;
      while (k >= 0 && content[k] === '\\') {
        backslashCount++;
        k--;
      }
      if (backslashCount % 2 === 0) {
        start = j;
        quote = c;
        break;
      }
    }
  }
  if (start === -1) return null;
  // 向后找结束引号
  let end = -1;
  escaped = false;
  for (let j = start + 1; j < content.length; j++) {
    const c = content[j];
    if (c === '\\') {
      escaped = !escaped;
      continue;
    }
    if (c === quote && !escaped) {
      end = j;
      break;
    }
    escaped = false;
    // 模板字符串可以跨行
    if (quote !== '`' && c === '\n') return null;
  }
  if (end === -1) return null;
  return { start, end, quote };
}

// 判断 pos 处的中文是否在 i18n.t() 或 t() 调用的 key 字符串内
function isInI18nTKey(content, pos) {
  const literal = findStringLiteral(content, pos);
  if (!literal) return false;
  // 检查字符串前面是否是 i18n.t( 或 t(
  const before = content.slice(Math.max(0, literal.start - 40), literal.start);
  if (/i18n\s*\.\s*t\s*\(\s*$/.test(before)) return true;
  if (/\bt\s*\(\s*$/.test(before)) return true;
  return false;
}

// 判断是否在 logger 调用中
function isInLoggerCall(content, pos) {
  const ctx = getLineContext(content, pos);
  if (/(apiLogger|console)\.\w+\s*\([^)]*$/.test(ctx.linePrefix)) return true;
  return false;
}

// 判断是否在 import 语句中
function isInImport(content, pos) {
  const ctx = getLineContext(content, pos);
  if (/^\s*import\s/.test(ctx.line) || /^\s*from\s/.test(ctx.line)) return true;
  return false;
}

function measureFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return { total: 0, hardcode: 0, inI18n: 0, inComment: 0, inLogger: 0, inImport: 0 };

  // 重置正则 lastIndex
  CHINESE_RE.lastIndex = 0;

  let hardcode = 0;
  let inI18n = 0;
  let inComment = 0;
  let inLogger = 0;
  let inImport = 0;
  let total = 0;

  let m;
  while ((m = CHINESE_RE.exec(content)) !== null) {
    const pos = m.index;
    total++;

    if (isInBlockComment(content, pos)) {
      const ctx = getLineContext(content, pos);
      if (ctx.linePrefix.includes('//')) {
        inComment++;
      } else {
        inComment++;
      }
      continue;
    }

    const ctx = getLineContext(content, pos);
    if (ctx.linePrefix.includes('//')) {
      inComment++;
      continue;
    }

    if (isInImport(content, pos)) {
      inImport++;
      continue;
    }

    if (isInLoggerCall(content, pos)) {
      inLogger++;
      continue;
    }

    if (isInI18nTKey(content, pos)) {
      inI18n++;
      continue;
    }

    hardcode++;
  }

  return { total, hardcode, inI18n, inComment, inLogger, inImport };
}

function measureModule(moduleName) {
  const modulePath = path.join(projectRoot, 'src', 'pages', moduleName);
  if (!fs.existsSync(modulePath)) {
    console.log(`  [SKIP] ${moduleName}: 目录不存在`);
    return null;
  }

  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.name === 'node_modules') continue;
      if (e.isDirectory()) walk(fp);
      else if (/\.tsx?$/.test(e.name)) files.push(fp);
    }
  }
  walk(modulePath);

  let totalAll = 0;
  let hardcodeAll = 0;
  let inI18nAll = 0;
  let inCommentAll = 0;
  let inLoggerAll = 0;
  let inImportAll = 0;
  const fileResults = [];

  for (const filePath of files) {
    const r = measureFile(filePath);
    totalAll += r.total;
    hardcodeAll += r.hardcode;
    inI18nAll += r.inI18n;
    inCommentAll += r.inComment;
    inLoggerAll += r.inLogger;
    inImportAll += r.inImport;
    if (r.hardcode > 0) {
      fileResults.push({ file: path.relative(projectRoot, filePath), ...r });
    }
  }

  console.log(`\n=== ${moduleName} ===`);
  console.log(`  总中文字符: ${totalAll}`);
  console.log(`  硬编码 (需处理): ${hardcodeAll}`);
  console.log(`  已在 i18n.t key 内: ${inI18nAll}`);
  console.log(`  在注释内: ${inCommentAll}`);
  console.log(`  在 logger 内: ${inLoggerAll}`);
  console.log(`  在 import 内: ${inImportAll}`);
  console.log(`  硬编码 TOP 文件:`);
  fileResults
    .sort((a, b) => b.hardcode - a.hardcode)
    .slice(0, 10)
    .forEach((r) => {
      console.log(`    ${r.file}: ${r.hardcode} 处`);
    });

  return { module: moduleName, total: totalAll, hardcode: hardcodeAll, inI18n: inI18nAll };
}

const targetModules = process.argv.slice(2);
const modules = targetModules.length > 0 ? targetModules : ['workflow', 'wms', 'erp', 'qms'];

console.log('=== TOPEMS i18n 中文硬编码测量 ===');
const results = [];
for (const mod of modules) {
  const r = measureModule(mod);
  if (r) results.push(r);
}

console.log('\n=== 汇总 ===');
console.log('  模块 | 总字符 | 硬编码 | 已i18n | 硬编码率');
for (const r of results) {
  const rate = r.total > 0 ? ((r.hardcode / r.total) * 100).toFixed(1) : '0';
  console.log(`  ${r.module} | ${r.total} | ${r.hardcode} | ${r.inI18n} | ${rate}%`);
}
