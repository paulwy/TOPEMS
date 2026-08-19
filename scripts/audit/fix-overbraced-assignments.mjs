#!/usr/bin/env node
/**
 * V212-Hotfix · 撤销 L2b-JSX-braces 对赋值语句的误伤
 *
 * pattern: `const/let/var  xxx = {designTokens...}` / `xxx = {designTokens...};`
 *   其中 `=` 前后有空格或 `= {`，是赋值语句而非 JSX 属性。
 * 需要去掉多余的 `{}`。
 *
 * 更可靠的判定：如果 `=` 前面不是 `<TagAttr` 上下文（即不是在标签内），
 * 我们就去掉 {}。采用"非 JSX 开始标签行内的赋值语句"启发式。
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.env.TOPEMS_ROOT || '/Users/air/TOPEMS';
const SRC = join(ROOT, 'apps/web/src');
const args = process.argv.slice(2);
const apply = args.includes('--apply');

function walk(dir, results) {
  results = results || [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full).replaceAll('\\', '/');
    if (rel.includes('/node_modules/')) continue;
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (['.tsx', '.ts'].includes(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function fixContent(content) {
  let count = 0;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 跳过看起来是 JSX 属性的 (不在同一行有 ={ 并且前面或整行包含 jsx 标签 < )
    // 命中形式: `word = {designTokens.xxx}` —— 把它变回 `word = designTokens.xxx`
    // 前提: 该行不是 JSX 属性（不以 < 开头，或没有紧跟标签内容）
    // 我们用更窄的规则：const/let/var 或单独的赋值语句（; 结尾或只有一行）
    const pattern = /^(\s*(?:export\s+)?(?:const|let|var)\s+\w+\s*)=\s*\{(designTokens(?:\.[\w$]+)+)\}(\s*;?\s*)$/;
    let m = line.match(pattern);
    if (m) {
      lines[i] = m[1] + '= ' + m[2] + m[3];
      count++;
      continue;
    }
    // 模式2: 裸赋值（非声明），例如 `this.foo = {designTokens...}`
    const pattern2 =
      /^(\s*(?:this\.)?(?:[a-zA-Z_$][\w$]*)(?:\.[a-zA-Z_$][\w$]*)*\s*)=\s*\{(designTokens(?:\.[\w$]+)+)\}(\s*;?\s*)$/;
    m = line.match(pattern2);
    if (m) {
      // 如果这行是缩进 2+ 级、且以分号结尾或行尾，则可能是赋值而非 JSX 属性 —— 只替换非 JSX 标签的行
      if (!/<\s*\w+/.test(line) || line.indexOf('=') < line.indexOf('<')) {
        lines[i] = m[1] + '= ' + m[2] + m[3];
        count++;
        continue;
      }
    }
    // 模式3: 无任何 const/let/var，但开头就是缩进 + 标识符 = 且不在 JSX 标签行
    const pattern3 = /^(\s*[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*\s*)=\s*\{(designTokens(?:\.[\w$]+)+)\}(\s*;?\s*)$/;
    m = line.match(pattern3);
    if (m && !/<\s*\w/.test(line)) {
      lines[i] = m[1] + '= ' + m[2] + m[3];
      count++;
    }
  }
  return { content: lines.join('\n'), count };
}

const files = walk(SRC);
let changed = 0;
let total = 0;
for (const file of files) {
  const c = readFileSync(file, 'utf-8');
  if (!/=\s*\{designTokens/.test(c)) continue;
  const { content, count } = fixContent(c);
  if (content !== c) {
    changed++;
    total += count;
    if (apply) writeFileSync(file, content, 'utf-8');
  }
}

console.log('assignment braces removed: ' + total + ' in ' + changed + ' files');
console.log('mode: ' + (apply ? 'APPLY' : 'DRY-RUN'));
if (!apply) console.log('run with --apply 真正写文件');
