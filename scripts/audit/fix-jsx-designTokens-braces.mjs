#!/usr/bin/env node
/**
 * V212-Hotfix · 修复 JSX 属性中的 designTokens 表达式缺失花括号问题
 *
 * 根因：在 v57-automation-panel.tsx 等文件中，
 *   `<StatCard color='#10b981' />` → C2 批量替换中间态 `<StatCard color='colors.success.dark' />`
 *   → L2b-fix 把字符串字面量变成表达式 `<StatCard color=designTokens.colors.success.dark />`
 *   但 JSX 语法要求非字符串字面量属性值必须用花括号：`color={designTokens.colors...}`
 *
 * 修复：对所有文件中 `<... \w+=designTokens.xxx />` 这种
 *   JSX 属性表达式替换为 `attr={designTokens.xxx}`
 *
 * 用法: node scripts/audit/fix-jsx-designTokens-braces.mjs --apply
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
    } else if (['.tsx'].includes(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

/**
 * 替换 JSX 属性中的无花括号 designTokens 表达式：
 *   attr=designTokens.colors.x.y
 * 为：
 *   attr={designTokens.colors.x.y}
 *
 * 正则：
 *   \b([a-zA-Z]\w*)\s*=\s*(designTokens\.[\w.]+)
 * 且后面紧跟空白 / `}` / `/`（JSX 语法）。
 */
function fixContent(content) {
  const regex = /(\b[a-zA-Z_$][\w$]*)\s*=\s*(designTokens\.[\w$]+(?:\.[\w$]+)*)(?!\s*[`'"(])/g;
  let count = 0;
  const next = content.replace(regex, (m, attr, expr) => {
    count++;
    return `${attr}={${expr}}`;
  });
  return { content: next, count };
}

const files = walk(SRC);
let changedFiles = 0;
let total = 0;

for (const file of files) {
  const c = readFileSync(file, 'utf-8');
  if (!/=\s*designTokens\./.test(c)) continue; // 快速过滤
  const { content, count } = fixContent(c);
  if (content !== c) {
    changedFiles++;
    total += count;
    if (apply) writeFileSync(file, content, 'utf-8');
    if (changedFiles <= 10) {
      console.log(('  ' + relative(ROOT, file)).padEnd(70) + '  ' + count);
    }
  }
}

console.log('\nJSX braces fix: ' + total + ' fixes in ' + changedFiles + ' files');
console.log('mode: ' + (apply ? 'APPLY' : 'DRY-RUN'));
if (!apply) console.log('run with --apply 真正写文件');
