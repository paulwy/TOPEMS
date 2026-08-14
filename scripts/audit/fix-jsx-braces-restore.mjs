#!/usr/bin/env node
/**
 * V212-Hotfix Final · 仅对 TSX 文件中**实际处于 JSX 标签内**的 designTokens 属性表达式
 * 恢复花括号（撤销 overbraced 脚本误杀的 JSX 属性花括号）。
 *
 * 思路：在 TSX 中通过栈跟踪判断当前行是否处于开始标签 `<TagName...` 内，
 *   如果是，且该行含 `xxx= designTokens.xxx.xxx`（注意 `=` 后面多了一个空格，这是前面脚本留下的痕迹），
 *   则恢复为 `xxx={designTokens.xxx.xxx}`。
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

function fixContent(content) {
  const lines = content.split('\n');
  let count = 0;
  // 标签深度栈：统计 `<` 是否比 `>`/`/>` 多
  let openTags = 0;
  let inOpenTag = false; // 是否在一个开始标签 `<Tag...` 内但尚未关闭
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 统计这一行的标签字符（简化，忽略字符串和注释）
    // 但为了准确，我们只处理明确的 JSX 属性行
    // 更简单的启发：如果这一行有 `= designTokens.` 并且该行不在大赋值上下文中（前面有 <），
    //   或者前面的行是 `<Tag` 开头 / 中间行
    // 检测是否可能在开始标签内：前面累计的未闭合 `<` 多于 `>`
    for (let k = 0; k < line.length; k++) {
      const c = line[k];
      if (c === '<') openTags++;
      if (c === '>') {
        if (openTags > 0) openTags--;
        inOpenTag = false;
      }
      if (c === '/' && line[k + 1] === '>') {
        inOpenTag = false;
      }
      if (c === '<' && /[A-Za-z_]/.test(line[k + 1])) {
        inOpenTag = true;
      }
    }

    // 匹配模式：\s+\w+= designTokens.xxx.xxx
    const regex = /(\s+[a-zA-Z_$][\w$]*)(=\s*)(designTokens(?:\.[\w$]+)+)(?=\s|$|\/>)/g;
    let newLine = line;
    if (inOpenTag || openTags > 0) {
      newLine = line.replace(regex, (m, name, eq, expr) => {
        count++;
        return `${name}={${expr.replace(/^\s+|\s+$/g, '')}}`;
      });
    }
    // 兜底：即使栈没判断对，若在标签内（比如前面是 `<StatCard` 这种属性列表的延续），也修复最明显的 `color= designTokens...` / `label= designTokens...` 模式
    if (newLine === line && /=\s+designTokens\./.test(line)) {
      // 看前一行是否有 `<\w+` 或属性列表
      const prev = i > 0 ? lines[i - 1] : '';
      if (/^\s*<\s*[A-Z]\w+/.test(prev) || /^\s{2,}[a-zA-Z_]\w*=/.test(prev)) {
        newLine = line.replace(regex, (m, name, eq, expr) => {
          count++;
          return `${name}={${expr.replace(/^\s+|\s+$/g, '')}}`;
        });
      }
    }
    lines[i] = newLine;
  }
  return { content: lines.join('\n'), count };
}

const files = walk(SRC);
let changed = 0;
let total = 0;
for (const file of files) {
  const c = readFileSync(file, 'utf-8');
  if (!/=\s+designTokens\./.test(c)) continue;
  const { content, count } = fixContent(c);
  if (content !== c) {
    changed++;
    total += count;
    if (apply) writeFileSync(file, content, 'utf-8');
  }
}

console.log('JSX designTokens braces restored: ' + total + ' in ' + changed + ' files');
console.log('mode: ' + (apply ? 'APPLY' : 'DRY-RUN'));
if (!apply) console.log('run with --apply 真正写文件');
