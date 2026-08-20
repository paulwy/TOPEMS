#!/usr/bin/env node
/**
 * L1-SAFE 保守删除器 v2 — "只删 export 前缀，不碰内部值"
 *
 * 处理模式：
 *  A) `export const/let/var/function/class/enum Name ...`  → 去掉 `export `
 *  B) `export { A, Name, B }` (local reexport)                → 从列表移除 Name
 *  C) `export { Name as Alias } from '...'` (reexport-from)   → 从列表移除 Name
 *
 * 决不：删除整个 const/function/class/enum 的值本体。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_BATCH = path.join(ROOT, 'scripts/audit', 'l1-batch2-final.json');

const arg = process.argv.find((a) => a.startsWith('--batch='));
const BATCH_FILE = arg ? path.resolve(ROOT, arg.split('=')[1]) : DEFAULT_BATCH;

if (!fs.existsSync(BATCH_FILE)) {
  console.error('❌ 找不到 batch 文件:', BATCH_FILE);
  process.exit(1);
}

const batch = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf8'));
console.log(`🔒 保守删除 v2 加载: ${batch.total_exports} 项 / ${batch.total_files} 文件`);
console.log(`   文件: ${path.relative(ROOT, BATCH_FILE)}\n`);

let totalDone = 0;
let totalFiles = 0;
const fails = [];

function stripExportKeyword(content, name) {
  // Pattern A: export const/let/var/function/class/enum Name
  const reDecl = new RegExp(
    `^(\\s*)export\\s+(const|let|var|function|class|enum)\\s+${name}\\b`,
    'm'
  );
  const before = content;
  content = content.replace(reDecl, (m, indent, kw) => {
    return `${indent}${kw} ${name}`;
  });
  return { content, touched: content !== before };
}

function removeFromExportBlock(content, name) {
  // 匹配两种：带 from 和不带 from 的 export {} 块
  // 块可能跨行。先找所有 export { ... } 的范围（支持多行）
  // 简化：逐行扫描并拼接 export { ... } 完整子串，再做替换

  const lines = content.split('\n');
  const result = [];
  let i = 0;
  let touchedAny = false;

  while (i < lines.length) {
    const line = lines[i];
    const startMatch = line.match(/^(\s*)export(\s+type)?\s*\{/);
    if (!startMatch) {
      result.push(line);
      i++;
      continue;
    }

    // 找到结束的 }; 或 } from
    let buf = line;
    let j = i + 1;
    let hasFrom = false;
    let closeIdx = -1;
    // 先看第一行有没有闭合
    const firstClose = line.indexOf('}');
    if (firstClose >= 0 && (line.includes('from') || line.trim().endsWith(';') || line.includes(' }'))) {
      // 单行
      buf = line;
      closeIdx = j; // meaning already closed at i line
      j = i;
    } else {
      // 多行：找到包含 } 的行
      while (j < lines.length) {
        buf += '\n' + lines[j];
        if (lines[j].includes('}')) {
          break;
        }
        j++;
      }
    }

    // 判断是否带 from
    const fromMatch = buf.match(/\}\s*(?:type\s+)?from\s+['"`]/);
    hasFrom = !!fromMatch;

    // 尝试在此块中删除 name token
    // 匹配: `Name as Alias` | `Name` | `Name,` | `, Name`  等，且是完整 identifier
    const innerMatch = buf.match(/export(\s+type)?\s*\{([\s\S]*)\}(\s*(?:type\s+)?from\s+['"`][^'"`]*['"`])?\s*;?\s*$/);
    if (innerMatch) {
      const typeKw = innerMatch[1] || '';
      let inner = innerMatch[2];
      const suffix = innerMatch[3] || '';

      // token 切分并过滤
      // 情况：  "A, B as C, D, E" → split /,\s*/ → 处理每个 token
      const tokens = inner
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const beforeLen = tokens.length;

      const filtered = tokens.filter((tok) => {
        // tok 形如: `Name` | `Name as Alias` | `type Name` | `type Name as Alias`
        const stripped = tok.replace(/^type\s+/i, '').trim();
        const mainName = stripped.split(/\s+as\s+/i)[0].trim();
        return mainName !== name;
      });

      if (filtered.length !== beforeLen) {
        touchedAny = true;
        if (filtered.length === 0) {
          // 整个 export 块空了 — 跳过（不写任何东西）
          i = j + 1;
          continue;
        }
        // 拼回 inner：保持原来的多行风格最好，但简化为单行
        const indent = startMatch[1] || '';
        const fromPart = suffix || '';
        let newline;
        if (hasFrom) {
          newline = `${indent}export${typeKw} { ${filtered.join(', ')} }${fromPart}`;
        } else {
          newline = `${indent}export${typeKw} { ${filtered.join(', ')} };`;
        }
        result.push(newline);
        i = j + 1;
        continue;
      }
    }

    // 没命中或块不对，原样输出
    for (let k = i; k <= j; k++) result.push(lines[k]);
    i = j + 1;
  }

  const newContent = result.join('\n');
  return { content: newContent, touched: touchedAny };
}

for (const [relFile, names] of Object.entries(batch.targets)) {
  const absFile = path.join(ROOT, relFile);
  if (!fs.existsSync(absFile)) {
    fails.push(`${relFile} (文件不存在)`);
    continue;
  }
  let content = fs.readFileSync(absFile, 'utf8');
  const original = content;
  const perFile = { ok: 0, miss: [] };

  for (const name of names) {
    // 先试 A: export const/... Name  → 删 export 关键字
    const rA = stripExportKeyword(content, name);
    content = rA.content;
    if (rA.touched) {
      perFile.ok++;
      continue;
    }
    // 试 B/C: 从 export { ... } 块 (local 或 from) 移除 name
    const rB = removeFromExportBlock(content, name);
    content = rB.content;
    if (rB.touched) {
      perFile.ok++;
      continue;
    }
    perFile.miss.push(name);
  }

  if (content !== original) {
    fs.writeFileSync(absFile, content);
    totalFiles++;
    totalDone += perFile.ok;
    const status = perFile.miss.length
      ? `(${perFile.ok}/${names.length}, 未命中: ${perFile.miss.join(',')})`
      : `(${perFile.ok}/${names.length})`;
    console.log(`✅ ${relFile} ${status}`);
    if (perFile.miss.length) {
      for (const m of perFile.miss) fails.push(`${relFile} :: ${m} (未找到匹配模式)`);
    }
  } else {
    console.log(`⏭️  ${relFile} (无修改)`);
    for (const m of names) fails.push(`${relFile} :: ${m} (无修改)`);
  }
}

console.log('\n========================================');
console.log(`✅ 保守删除完成：${totalDone} 个导出，涉及 ${totalFiles} 个文件`);
if (fails.length) {
  console.log(`⚠️  未处理/未命中 ${fails.length} 项（可能是类型导出/删除器未覆盖的模式）`);
  for (const f of fails.slice(0, 20)) console.log('   -', f);
  if (fails.length > 20) console.log(`   ... +${fails.length - 20} more`);
}
console.log('💡 下一步：cd apps/web && npx tsc --noEmit');
