/**
 * 列出剩余中文硬编码行（不在 i18n.t、注释、logger、import 内）
 *
 * 用法： node scripts/i18n-list.mjs <module> [file2 ...]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHINESE_RE = /[\u4e00-\u9fff]/g;

function getLineContext(content, pos) {
  const lineStart = content.lastIndexOf('\n', pos) + 1;
  const lineEnd = content.indexOf('\n', pos);
  return {
    lineStart,
    lineEnd: lineEnd === -1 ? content.length : lineEnd,
    linePrefix: content.slice(lineStart, pos),
    line: content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd),
    lineNum: content.slice(0, pos).split('\n').length,
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

function findStringLiteral(content, pos) {
  let start = -1;
  let quote = '';
  for (let j = pos; j >= 0; j--) {
    const c = content[j];
    if ((c === '"' || c === "'" || c === '`')) {
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
  let end = -1;
  let escaped = false;
  for (let j = start + 1; j < content.length; j++) {
    const c = content[j];
    if (c === '\\') { escaped = !escaped; continue; }
    if (c === quote && !escaped) { end = j; break; }
    escaped = false;
    if (quote !== '`' && c === '\n') return null;
  }
  if (end === -1) return null;
  return { start, end, quote };
}

function isInI18nTKey(content, pos) {
  const literal = findStringLiteral(content, pos);
  if (!literal) return false;
  const before = content.slice(Math.max(0, literal.start - 30), literal.start);
  if (/i18n\s*\.\s*t\s*\(\s*$/.test(before)) return true;
  return false;
}

function isInLoggerCall(content, pos) {
  const ctx = getLineContext(content, pos);
  if (/(apiLogger|console)\.\w+\s*\([^)]*$/.test(ctx.linePrefix)) return true;
  return false;
}

function isInImport(content, pos) {
  const ctx = getLineContext(content, pos);
  if (/^\s*import\s/.test(ctx.line) || /^\s*from\s/.test(ctx.line)) return true;
  return false;
}

function listFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  CHINESE_RE.lastIndex = 0;
  const seen = new Set();
  const lines = [];
  let m;
  while ((m = CHINESE_RE.exec(content)) !== null) {
    const pos = m.index;
    if (isInBlockComment(content, pos)) continue;
    const ctx = getLineContext(content, pos);
    if (ctx.linePrefix.includes('//')) continue;
    if (isInImport(content, pos)) continue;
    if (isInLoggerCall(content, pos)) continue;
    if (isInI18nTKey(content, pos)) continue;

    if (!seen.has(ctx.lineNum)) {
      seen.add(ctx.lineNum);
      lines.push({ num: ctx.lineNum, line: ctx.line.trim() });
    }
  }
  return lines;
}

const args = process.argv.slice(2);
const module = args[0];
const modulePath = path.join(projectRoot, 'src', 'pages', module);
const specificFiles = args.slice(1);

let files = [];
if (specificFiles.length > 0) {
  files = specificFiles.map(f => path.resolve(f));
} else {
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp);
      else if (/\.tsx?$/.test(e.name)) files.push(fp);
    }
  }
  walk(modulePath);
}

console.log(`=== ${module} 剩余硬编码 ===`);
let total = 0;
for (const filePath of files) {
  const lines = listFile(filePath);
  if (lines.length > 0) {
    console.log(`\n--- ${path.relative(projectRoot, filePath)} (${lines.length} 行) ---`);
    for (const l of lines) {
      console.log(`  L${l.num}: ${l.line}`);
    }
    total += lines.length;
  }
}
console.log(`\n总计: ${total} 行含硬编码`);
