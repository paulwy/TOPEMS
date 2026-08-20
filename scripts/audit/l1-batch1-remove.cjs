#!/usr/bin/env node
/**
 * L1-SAFE 批量删除器：针对 config + constants 第一批 78 项
 * 精确移除：
 *   - export const/function/class/enum NAME = / () {
 *   - export { NAME, ... } 列表中单个 NAME
 *   - export { NAME } from './x' 整行
 *
 * 不触碰：非 export 的局部定义、type/interface 定义
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const arg = process.argv.find(a => a.startsWith('--batch='));
const BATCH_FILE = arg
  ? path.resolve(ROOT, arg.split('=')[1])
  : path.join(ROOT, 'scripts', 'audit', 'l1-batch1-config-constants.json');

const data = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf8'));
const targets = data.targets; // file -> name[]

let totalRemoved = 0;
let totalFilesChanged = 0;

for (const [fileRel, names] of Object.entries(targets)) {
  const filePath = path.join(ROOT, fileRel);
  if (!fs.existsSync(filePath)) {
    console.log(`⏭  跳过（不存在）: ${fileRel}`);
    continue;
  }
  let src = fs.readFileSync(filePath, 'utf8');
  let original = src;
  const namesToRemove = new Set(names);
  let namesProcessed = new Set();

  // ===== Pass 1: export const/let/var/function/class/enum NAME =====
  // 逐个名字处理，避免正则复杂性
  for (const name of names) {
    // 1a) 单行（or 开头行）: export const NAME = ... ;  或最后一行 };
    // 匹配多行直到闭合
    const declStartRe = new RegExp(
      `^(\\s*)export\\s+(?:declare\\s+)?(const|let|var|function|class|enum)\\s+${name}\\b([\\s\\S]*?)`,
      'm'
    );
    // 简单方法：逐行扫描找到起始行 → 深度匹配闭合 → 删除
    const lines = src.split('\n');
    let startIdx = -1;
    let kind = null;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(
        new RegExp(`^\\s*export\\s+(?:declare\\s+)?(const|let|var|function|class|enum)\\s+${name}\\b`)
      );
      if (m) { startIdx = i; kind = m[1]; break; }
    }
    if (startIdx >= 0) {
      // 找到结束行
      let endIdx = startIdx;
      // 简化：不同 kind 处理
      if (kind === 'const' || kind === 'let' || kind === 'var') {
        // 直到找到行尾 ; 或闭合 }]) + ;
        let depth = 0, seenAssign = false;
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i];
          // 去掉字符串和注释
          const clean = line
            .replace(/\/\/.*$/, '')
            .replace(/'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|`[^`\\]*(?:\\.[^`\\]*)*`/g, '""');
          // 简单深度: 只在碰到 = 之后开始看闭合
          if (clean.includes('=')) seenAssign = true;
          if (seenAssign) {
            for (const ch of clean) {
              if (ch === '{' || ch === '[' || ch === '(') depth++;
              else if (ch === '}' || ch === ']' || ch === ')') depth--;
            }
          }
          endIdx = i;
          if (seenAssign && depth <= 0 && (clean.includes(';') || depth < 0 || i === lines.length - 1)) {
            // 还需要去掉下一行的空行
            while (endIdx + 1 < lines.length && lines[endIdx + 1].trim() === '') {
              endIdx++;
            }
            break;
          }
        }
      } else if (kind === 'function') {
        // 函数声明：{ 深度匹配 }
        let depth = 0, seenBrace = false;
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i];
          const clean = line
            .replace(/\/\/.*$/, '')
            .replace(/'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|`[^`\\]*(?:\\.[^`\\]*)*`/g, '""');
          for (const ch of clean) {
            if (ch === '{') { depth++; seenBrace = true; }
            else if (ch === '}') {
              depth--;
            }
          }
          endIdx = i;
          if (seenBrace && depth <= 0) {
            while (endIdx + 1 < lines.length && lines[endIdx + 1].trim() === '') {
              endIdx++;
            }
            break;
          }
        }
      } else if (kind === 'class' || kind === 'enum') {
        let depth = 0, seenBrace = false;
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i];
          const clean = line
            .replace(/\/\/.*$/, '')
            .replace(/'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|`[^`\\]*(?:\\.[^`\\]*)*`/g, '""');
          for (const ch of clean) {
            if (ch === '{') { depth++; seenBrace = true; }
            else if (ch === '}') { depth--; }
          }
          endIdx = i;
          if (seenBrace && depth <= 0) {
            while (endIdx + 1 < lines.length && lines[endIdx + 1].trim() === '') {
              endIdx++;
            }
            break;
          }
        }
      }
      // 删除
      const removedCount = endIdx - startIdx + 1;
      lines.splice(startIdx, removedCount);
      src = lines.join('\n');
      namesProcessed.add(name);
      totalRemoved++;
      continue;
    }

    // ===== Pass 2: reexport NAME from './x'（整行或在列表中）=====
    // 2a): export { NAME } from '...'; 整行
    const wholeLineRe = new RegExp(
      `^\\s*export\\s*\\{\\s*(?:type\\s+)?${name}\\s*\\}\\s*from\\s*['\"][^'\"]*['\"]\\s*;?\\s*\\n?`,
      'm'
    );
    if (wholeLineRe.test(src)) {
      src = src.replace(wholeLineRe, '');
      namesProcessed.add(name);
      totalRemoved++;
      continue;
    }
    // 2b): export { A, NAME, B } from '...'; 或 export { A, NAME, B };
    // 先在单行处理：NAME[, ] 或 [, ]NAME
    const inListLineRe = new RegExp(
      `(export\\s*\\{[^}]*?)\\b(?:type\\s+)?${name}\\b\\s*,?\\s*([^}]*\\}(?:\\s*from\\s*['\"][^'\"]*['\"])?\\s*;?)`,
      'm'
    );
    // 更简化：逐行逐 export {} 块
    // 用一个循环：找到所有 export { ... } 块（跨多行合并）
    // 尝试替换
    const lines2 = src.split('\n');
    let foundBlock = false;
    for (let i = 0; i < lines2.length; i++) {
      if (!lines2[i].includes('export')) continue;
      // 合并到 } [from '...'];
      if (!/\bexport\s*\{/.test(lines2[i])) continue;
      let block = lines2[i];
      let j = i;
      while (j < lines2.length && !/\}[^;]*;?$/.test(block)) {
        j++;
        if (j - i > 50) break;
        block += '\n' + lines2[j];
      }
      // 看 block 是否包含 NAME，且 NAME 在花括号列表
      const inBlockRe = new RegExp(
        `\\{([^}]*)\\b(?:type\\s+)?${name}\\b\\s*,?\\s*([^}]*)\\}`,
        's'
      );
      const bm = block.match(inBlockRe);
      if (bm) {
        // 删除 NAME: 用替换
        const before = bm[1];
        const after = bm[2];
        // 修复前后的逗号：把 "A, NAME, B" → "A, B"；"NAME, B" → "B"；"A, NAME" → "A"
        const newInner = (before + after)
          .replace(/,\s*,/g, ',')
          .replace(/^\s*,\s*/, '')
          .replace(/\s*,\s*$/, '');
        let newBlock;
        const fromRe = block.match(/from\s*(['"][^'"]*['"])/);
        if (fromRe) {
          newBlock = `export { ${newInner} } from ${fromRe[1]};`;
        } else {
          newBlock = `export { ${newInner} };`;
        }
        if (newInner.trim() === '') {
          // 如果空了：整段删除
          newBlock = '';
        }
        lines2.splice(i, j - i + 1, ...newBlock.split('\n'));
        src = lines2.join('\n');
        namesProcessed.add(name);
        totalRemoved++;
        foundBlock = true;
      }
      if (foundBlock) break;
    }
  }

  // 清理结果：去掉多余连续空行（>2 个变 2 个）
  src = src.replace(/\n{3,}/g, '\n\n');

  if (src !== original) {
    fs.writeFileSync(filePath, src);
    const removed = namesProcessed.size;
    const missed = names.filter(n => !namesProcessed.has(n));
    console.log(`✅ ${fileRel}  删除 ${removed}/${names.length}`);
    if (missed.length) console.log(`   ⚠️  未处理: ${missed.join(', ')}`);
    totalFilesChanged++;
  } else {
    console.log(`⏭  ${fileRel}  无变化`);
  }
}

console.log(`\n========================================`);
console.log(`✅ 删除完成：${totalRemoved} 个导出，涉及 ${totalFilesChanged} 个文件`);
console.log(`💡 下一步：cd apps/web && npx tsc --noEmit`);
