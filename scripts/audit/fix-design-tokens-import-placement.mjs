#!/usr/bin/env node
/**
 * V212-Hotfix · 修复 designTokens import 误插入到多行 import 块中间的问题
 *
 * 根因：fix-colors-reference-fix.mjs 的 ensureTokensImport 使用了
 * lastImportIdx = 最后一行以 `import ` 开头的行的下一行
 * 但是多行 import { \n  a, b, c \n} from 中 `import {` 也是以 `import ` 开头的，
 * 导致插入点跑到多行 import 块中间。
 *
 * 修复：
 *  1. 删除孤立的 `import { designTokens... } from '@topems/tokens';` 行，
 *     如果其下一行是 `  aaa,`（上一行 import { 的子项）。
 *  2. 在文件中所有 `} from 'xxx';` 真正结束之后（所有 import 块之外），
 *     添加 designTokens import。
 *
 * 用法: node scripts/audit/fix-design-tokens-import-placement.mjs --apply
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.env.TOPEMS_ROOT || '/Users/air/TOPEMS';
const SRC = join(ROOT, 'apps/web/src');
const BAD_LINE = "import { designTokens, semanticTokens } from '@topems/tokens';";
const BAD_LINE_ALT = 'import { designTokens, semanticTokens } from "@topems/tokens";';
const BAD_LINE_THEME = "import { designTokens, semanticTokens } from 'theme/tokens';";

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

function containsBadLine(content) {
  return content.includes(BAD_LINE) || content.includes(BAD_LINE_ALT) || content.includes(BAD_LINE_THEME);
}

/**
 * 判断 designTokens import 行是不是被插到一个多行 import { ... } 块中间
 * 规则：
 *   - 如果 BAD_LINE 所在行 i ，前一行 (i-1) 是 `import {` / `import { name,`，或者
 *   - 后一行 (i+1) 以 `  ident,` 形式缩进、是 identifiers 列表
 * 都算"放错了"。
 */
function misplacedIndices(lines) {
  const misplaced = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l !== BAD_LINE && l !== BAD_LINE_ALT && l !== BAD_LINE_THEME) continue;
    // 前一行
    const prev = i > 0 ? lines[i - 1] : '';
    const next = i < lines.length - 1 ? lines[i + 1] : '';
    const inMultiBefore = /^\s*import\s*\{\s*$/.test(prev) || /^\s*import\s*\{[^}]+\s*$/.test(prev);
    const inMultiAfter = /^\s{2,}[a-zA-Z_][\w]*.*,?\s*$/.test(next) && !/^\s*import/.test(next) && !/^\s*\}/.test(next);
    if (inMultiBefore || inMultiAfter) {
      misplaced.push(i);
    }
  }
  return misplaced;
}

/** 找到"真正所有 import 结束之后"的行。
 *  定义：最后一个多行 import 块的 `} from 'xxx';` 之后，或者最后一个独立 `import` 之后。
 *  如果一个 import 多行，把它的结尾行 `} from 'xxx';` 视为该 import 的结尾行。
 */
function findLastImportEnd(lines) {
  let endIdx = -1;
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('import ')) {
      // 多行?
      if (/^\s*import\s*\{[^}]*\}\s*from\s*['"].*['"];?\s*$/.test(lines[i])) {
        endIdx = i; // 单行 import
        i++;
        continue;
      }
      // 多行 import { \n...\n} from '...'
      if (/^\s*import\s*\{/.test(lines[i])) {
        let j = i;
        let depth = 0;
        let started = false;
        outer: for (; j < lines.length; j++) {
          for (let k = 0; k < lines[j].length; k++) {
            const c = lines[j][k];
            if (!started) {
              if (c === '{') {
                started = true;
                depth = 1;
              }
              continue;
            }
            if (c === '{') depth++;
            if (c === '}') {
              depth--;
              if (depth === 0) {
                // 找到 `} from ...;` 这行，认为 import 结束于该分号
                endIdx = j;
                i = j + 1;
                break outer;
              }
            }
          }
        }
        if (!started) i++;
        continue;
      }
      // 无花括号 import (import x from 'y' / import 'y')
      endIdx = i;
    } else if (trimmed !== '' && !trimmed.startsWith('//') && !/^\/\*.*\*\/\s*$/.test(trimmed)) {
      // 遇到非 import 非注释非空行，停止
      break;
    }
    i++;
  }
  return endIdx;
}

const files = walk(SRC);
let fixedFiles = 0;
let totalFixes = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf-8');
  if (!containsBadLine(original)) continue;

  const lines = original.split('\n');
  const misplaced = misplacedIndices(lines);
  if (misplaced.length === 0) continue;

  // 删除放错位置的 bad lines
  const linesAfterRemove = lines.filter((_, idx) => !misplaced.includes(idx));

  // 再判断 remaining content 是否还有 designTokens import（例如其他地方放对的）
  const hasRemaining = linesAfterRemove.some((l) => l === BAD_LINE || l === BAD_LINE_ALT || l === BAD_LINE_THEME);

  let finalLines = linesAfterRemove;
  if (!hasRemaining) {
    // 在真正的 import 结尾点之后补一个 designTokens import
    const insertAt = findLastImportEnd(linesAfterRemove) + 1;
    finalLines = [...linesAfterRemove.slice(0, insertAt), BAD_LINE, ...linesAfterRemove.slice(insertAt)];
  }
  const newContent = finalLines.join('\n');
  if (newContent !== original) {
    fixedFiles++;
    totalFixes += misplaced.length;
    if (apply) writeFileSync(file, newContent, 'utf-8');
  }
}

console.log('misplaced imports fixed: ' + totalFixes + ' in ' + fixedFiles + ' files.');
console.log('mode: ' + (apply ? 'APPLY' : 'DRY-RUN'));
if (!apply) console.log('run with --apply 真正写文件');
