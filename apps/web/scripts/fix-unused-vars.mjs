#!/usr/bin/env node
/**
 * V65.2.1: 自动修复 tsc --noUnusedLocals/--noUnusedParameters 报告的未用变量
 *
 * 处理策略：
 * - TS6192 (All imports unused): 删除整行 import
 * - TS6133 (is declared but never read):
 *   - import 语句中的未用导入 → 从 import 中移除
 *   - 函数参数 → 前缀加 _
 *   - 局部变量 / 解构 → 删除声明（保守：仅删除整行声明，不动多行）
 * - TS6196 (declared but never used): 跳过（函数/类/接口，需人工判断）
 * - TS6198 (All destructured elements unused): 删除整行
 *
 * 用法：node scripts/fix-unused-vars.mjs < tsc-errors.txt
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = process.cwd();

// 正则匹配 tsc 错误行
// 格式: src/path/file.ts(123,45): error TS6133: 'varName' is declared but its value is never read.
const ERROR_RE =
  /^(.+?)\((\d+),(\d+)\): error (TS\d+): '(.+?)' is (?:declared but its value is never read|declared but never used)\./;

/** @type {Map<string, Array<{line: number; col: number; code: string; name: string}>>} */
const fileErrors = new Map();

let skipped = 0;
let totalLines = 0;

for (const line of process.argv.includes('-') ? [] : []) {
  // noop
}

// Read from stdin
import { createInterface } from 'readline';
const rl = createInterface({ input: process.stdin });

const allLines = [];
rl.on('line', (line) => allLines.push(line));
rl.on('close', () => {
  for (const line of allLines) {
    totalLines++;
    const m = line.match(ERROR_RE);
    if (!m) {
      skipped++;
      continue;
    }
    const [, filePath, lineStr, colStr, code, name] = m;
    const lineNum = parseInt(lineStr, 10);
    const col = parseInt(colStr, 10);

    // 跳过 TS6196（未用的函数/类/接口声明，需人工判断）
    if (code === 'TS6196') {
      skipped++;
      continue;
    }

    const absPath = resolve(ROOT, filePath);
    if (!fileErrors.has(absPath)) {
      fileErrors.set(absPath, []);
    }
    fileErrors.get(absPath).push({ line: lineNum, col, code, name });
  }

  let totalFixed = 0;
  let totalSkipped = 0;
  const skippedFiles = [];

  for (const [filePath, errors] of fileErrors) {
    // 按行号降序排列，这样从后往前修改不会影响前面的行号
    errors.sort((a, b) => b.line - a.line);

    let content;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      totalSkipped += errors.length;
      skippedFiles.push(filePath);
      continue;
    }

    const lines = content.split('\n');
    let fileFixed = 0;
    let fileSkipped = 0;

    for (const err of errors) {
      const idx = err.line - 1;
      if (idx >= lines.length) {
        fileSkipped++;
        continue;
      }
      const sourceLine = lines[idx];

      // 判断是否是 import 语句
      const isImportLine =
        /^\s*import\s/.test(sourceLine) || /^\s*}\s*from\s+['"]/.test(sourceLine);

      if (err.code === 'TS6192') {
        // 整行 import 未用 → 删除
        lines[idx] = null; // mark for removal
        fileFixed++;
        continue;
      }

      if (err.code === 'TS6198') {
        // 所有解构元素未用 → 删除整行
        lines[idx] = null;
        fileFixed++;
        continue;
      }

      if (err.code === 'TS6133') {
        if (isImportLine) {
          // import 中的未用导入
          // 策略1: 如果整行只导入这一个名字 → 删整行
          //   import { Foo } from 'bar';
          // 策略2: 多个名字中删一个
          //   import { Foo, Bar } from 'baz'; → import { Bar } from 'baz';
          //   import { Foo, Bar, Baz } from 'baz'; → import { Bar, Baz } from 'baz';
          const singleImportRe = new RegExp(
            `^\\s*import\\s+\\{\\s*${escapeRegex(err.name)}\\s*\\}\\s*from\\s+['"]`
          );
          if (singleImportRe.test(sourceLine)) {
            lines[idx] = null;
            fileFixed++;
            continue;
          }

          // 多个名字中删一个: { name, other } 或 { other, name }
          // 需要处理: 前面有逗号 / 后面有逗号 / 前后都有
          const nameRe = new RegExp(`\\b${escapeRegex(err.name)}\\b`);

          // 尝试: , name → 删除 (name 在中间或末尾)
          const removed = sourceLine.replace(
            new RegExp(`,\\s*${escapeRegex(err.name)}\\b`),
            ''
          );
          if (removed !== sourceLine) {
            lines[idx] = removed;
            fileFixed++;
            continue;
          }

          // 尝试: name, → 删除 (name 在开头)
          const removed2 = sourceLine.replace(
            new RegExp(`${escapeRegex(err.name)}\\s*,\\s*`),
            ''
          );
          if (removed2 !== sourceLine) {
            lines[idx] = removed2;
            fileFixed++;
            continue;
          }

          // 无法安全删除，跳过
          fileSkipped++;
          continue;
        }

        // 判断是否是函数参数
        // 查看该行是否包含函数定义模式: function foo(... or const foo = (... => ... or foo = (...
        const isParamLine =
          /(\(|,)\s*\w+\s*[,:)]/.test(sourceLine) &&
          !/=\s*\{/.test(sourceLine.split(err.name)[0]); // 排除对象解构赋值

        // 更精确：检查 name 是否在括号内（函数参数）
        const nameCol = err.col - 1; // 0-indexed
        const beforeName = sourceLine.substring(0, nameCol);
        const afterName = sourceLine.substring(nameCol + err.name.length);

        // 检查参数模式: 前面是 ( 或 , 后面是 , 或 ) 或 : 或 =
        const isParam =
          /[(,]\s*$/.test(beforeName) && /^[,):=]/.test(afterName.trimStart());

        if (isParam) {
          // 前缀加 _
          // 但如果已经是 _ 开头就不加
          if (!err.name.startsWith('_')) {
            const newName = `_${err.name}`;
            lines[idx] =
              sourceLine.substring(0, nameCol) +
              newName +
              sourceLine.substring(nameCol + err.name.length);
            fileFixed++;
            continue;
          }
          fileSkipped++;
          continue;
        }

        // 局部变量: const/let/var name = ...
        const localVarRe = new RegExp(
          `^\\s*(?:const|let|var)\\s+${escapeRegex(err.name)}\\s*=`
        );
        if (localVarRe.test(sourceLine)) {
          // 检查是否是单行声明（以 ; 结尾或就是最后一行）
          const trimmed = sourceLine.trim();
          if (trimmed.endsWith(';') || trimmed.endsWith(')') || idx === lines.length - 1) {
            lines[idx] = null;
            fileFixed++;
            continue;
          }
          // 多行声明，跳过
          fileSkipped++;
          continue;
        }

        // 解构: const { name } = ... 或 const { name, other } = ...
        const destructureRe = new RegExp(
          `^\\s*(?:const|let|var)\\s+\\{[^}]*\\b${escapeRegex(err.name)}\\b[^}]*\\}\\s*=`
        );
        if (destructureRe.test(sourceLine)) {
          // 从解构中移除该名字
          // 尝试: , name → 删除
          let removed = sourceLine.replace(
            new RegExp(`,\\s*${escapeRegex(err.name)}\\b`),
            ''
          );
          if (removed !== sourceLine) {
            lines[idx] = removed;
            fileFixed++;
            continue;
          }
          // 尝试: name, → 删除
          removed = sourceLine.replace(
            new RegExp(`\\b${escapeRegex(err.name)}\\s*,\\s*`),
            ''
          );
          if (removed !== sourceLine) {
            lines[idx] = removed;
            fileFixed++;
            continue;
          }
          // 尝试: { name } → 删整行
          if (new RegExp(`\\{\\s*${escapeRegex(err.name)}\\s*\\}`).test(sourceLine)) {
            lines[idx] = null;
            fileFixed++;
            continue;
          }
          fileSkipped++;
          continue;
        }

        // 其他情况（如函数内解构、复杂声明等）→ 跳过
        fileSkipped++;
        continue;
      }

      fileSkipped++;
    }

    if (fileFixed > 0) {
      const newContent = lines.filter((l) => l !== null).join('\n');
      try {
        writeFileSync(filePath, newContent, 'utf-8');
        totalFixed += fileFixed;
      } catch {
        totalSkipped += fileFixed;
      }
    }
    totalSkipped += fileSkipped;
  }

  console.log(`\n=== Fix Summary ===`);
  console.log(`Total errors parsed: ${totalLines}`);
  console.log(`Total fixed: ${totalFixed}`);
  console.log(`Total skipped: ${totalSkipped + skipped}`);
  console.log(`Files modified: ${[...fileErrors.keys()].filter((f) => {
    const errs = fileErrors.get(f);
    return errs.some(() => true);
  }).length}`);
  if (skippedFiles.length > 0) {
    console.log(`Files that couldn't be read: ${skippedFiles.length}`);
  }
});

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
