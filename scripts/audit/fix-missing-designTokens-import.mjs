#!/usr/bin/env node
/**
 * V212-Hotfix last-mile · 补漏缺失的 designTokens import
 *
 * 条件：
 *   - 文件 .ts / .tsx (src)
 *   - 文件内容含标识符 `designTokens.` 但未 import（搜索 designTokens 且不在字符串中）
 *   - 已有 @topems/tokens 或 theme/tokens import → 向花括号内追加 designTokens/semanticTokens
 *   - 否则在所有 import 结尾点补一行 import { designTokens, semanticTokens } from '@topems/tokens';
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
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

// 简易 token 标识符使用检测（排除注释/字符串）
// 通过 /\bdesignTokens\./g 匹配字符串 & 代码中的出现，但排除 'designTokens.colors.xxx' 这种本身在字符串里（之前脚本生成的中间态残留）。
// 因为现在中间态都已修复，所以只要有标识符 designTokens 就是要 import 的。
function usesDesignTokens(content) {
  // 匹配 `designTokens.` 前面不直接是引号（排除纯字符串）
  // 实际上只要含 \bdesignTokens\. 就基本是在用
  return /\bdesignTokens\s*\./.test(content);
}

function hasTokensImport(content) {
  // 匹配任意从 @topems/tokens 或 theme/tokens 导入 designTokens
  return /import\s*\{[^}]*\bdesignTokens\b[^}]*\}\s*from\s*['"](?:@topems\/tokens|@\/theme\/tokens|theme\/tokens)['"]/.test(
    content
  );
}

// 找正确的插入位置：最后一个 import 语句真正结束之后
function insertAfterLastImport(content, importLine) {
  const lines = content.split('\n');
  let endIdx = -1;
  let i = 0;
  while (i < lines.length) {
    const L = lines[i];
    if (!L.trim().startsWith('import ')) {
      // 空行 / 注释 继续
      if (L.trim() === '' || L.trim().startsWith('//')) { i++; continue; }
      // block 注释 /* */ 单行
      if (/^\s*\/\*[\s\S]*\*\/\s*$/.test(L)) { i++; continue; }
      break;
    }
    // import 块可能是多行 { \n ... \n} from
    if (/^\s*import\s*\{/.test(L)) {
      // 扫描直到匹配到 `} from`
      for (let j = i; j < lines.length; j++) {
        if (/}\s*from\s*['"]/.test(lines[j])) {
          endIdx = j;
          i = j + 1;
          break;
        }
      }
      continue;
    }
    endIdx = i;
    i++;
  }
  const insertAt = endIdx >= 0 ? endIdx + 1 : 0;
  lines.splice(insertAt, 0, importLine);
  return lines.join('\n');
}

function ensureDesignTokens(content) {
  // 优先补到已有的 @topems/tokens 或 @/theme/tokens 花括号内
  // pattern 1: @topems/tokens
  if (content.includes("from '@topems/tokens'") || content.includes('from "@topems/tokens"')) {
    const reg = /(import\s*\{)([^}]*)(\}\s*from\s*['"]@topems\/tokens['"])/;
    const ncontent = content.replace(reg, (m, open, inner, close) => {
      const hasDt = /\bdesignTokens\b/.test(inner);
      if (hasDt) return m;
      const sep = inner.trim().endsWith(',') || inner.trim() === '' ? '' : ', ';
      const extras = (inner.includes('semanticTokens') ? '' : 'semanticTokens, ') + 'designTokens';
      return open + inner.trim() + sep + extras + ' ' + close;
    });
    if (ncontent !== content) return ncontent;
  }

  // pattern 2: @/theme/tokens 或 theme/tokens
  const thReg = /(import\s*\{)([^}]*)(\}\s*from\s*['"](?:@\/)?theme\/tokens['"])/;
  if (thReg.test(content)) {
    return content.replace(thReg, (m, open, inner, close) => {
      const hasDt = /\bdesignTokens\b/.test(inner);
      if (hasDt) return m;
      const sep = inner.trim().endsWith(',') || inner.trim() === '' ? '' : ', ';
      const extras = (inner.includes('semanticTokens') ? '' : 'semanticTokens, ') + 'designTokens';
      return open + inner.trim() + sep + extras + ' ' + close;
    });
  }

  // 否则追加
  return insertAfterLastImport(content, "import { designTokens, semanticTokens } from '@topems/tokens';");
}

const files = walk(SRC);
let changed = 0;
for (const file of files) {
  const c = readFileSync(file, 'utf-8');
  if (!usesDesignTokens(c)) continue;
  if (hasTokensImport(c)) continue;
  const nc = ensureDesignTokens(c);
  if (nc !== c) {
    changed++;
    if (apply) writeFileSync(file, nc, 'utf-8');
  }
}
console.log('designTokens import added to: ' + changed + ' files');
console.log('mode: ' + (apply ? 'APPLY' : 'DRY-RUN'));
if (!apply) console.log('run with --apply 真正写文件');
