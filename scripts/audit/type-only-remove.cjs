#!/usr/bin/env node
/**
 * TYPE-only 保守删除器 — 基于 type-only-final.json（type-only-scan.py 产出）
 *
 * 处理模式：
 *  A) `export type|interface Name`  → 去掉 `export `（声明保留，文件内部使用不受影响）
 *  B) `export { type A, Name, type B }` (local reexport) → 从列表移除 Name
 *  C) `export { Name as Alias, type B } from '...'` (reexport-from) → 从列表移除 Name
 *
 * 决不：删除整个 type/interface 声明本体。
 * 用法：node scripts/audit/type-only-remove.cjs [--batch=<json>]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const arg = process.argv.find((a) => a.startsWith('--batch='));
const BATCH_FILE = arg
  ? path.resolve(ROOT, arg.split('=')[1])
  : path.join(ROOT, 'scripts/audit', 'type-only-final.json');

if (!fs.existsSync(BATCH_FILE)) {
  console.error('❌ 找不到 batch 文件:', BATCH_FILE);
  process.exit(1);
}

// 支持 targets 格式（{rel: [names]}）与 scan 输出格式（[{name,defFile,...}]）
let batch;
try {
  batch = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf8'));
} catch (e) {
  console.error('❌ batch 解析失败:', e.message);
  process.exit(1);
}

let targets;
if (batch.targets) {
  targets = batch.targets;
} else if (Array.isArray(batch)) {
  targets = {};
  for (const x of batch) {
    const rel = x.defFile.replace(/^\/Users\/xingzhai\/TOPEMS\//, '');
    (targets[rel] = targets[rel] || []).push(x.name);
  }
} else {
  console.error('❌ 未知 batch 结构（需 targets 映射或数组）');
  process.exit(1);
}

const total = Object.values(targets).flat().length;
console.log(`🔒 TYPE-only 保守删除加载: ${total} 项 / ${Object.keys(targets).length} 文件\n`);

let totalDone = 0;
let totalFiles = 0;
const fails = [];

function stripExportKeyword(content, name) {
  // Pattern A: export type|interface Name  (也兼容 const/function 等)
  const reDecl = new RegExp(
    `^(\\s*)export\\s+(?:declare\\s+)?(?:abstract\\s+)?(type|interface|const|let|var|function|class|enum)\\s+${name}\\b`,
    'm'
  );
  const before = content;
  content = content.replace(reDecl, (m, indent, kw) => `${indent}${kw} ${name}`);
  return { content, touched: content !== before };
}

function removeFromExportBlock(content, name) {
  // Pattern B/C: export { ... [type] Name ... } [from '...']
  const lines = content.split('\n');
  const out = [];
  let touched = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const startMatch = line.match(/^(\s*)export(\s+type)?\s*\{/);
    if (startMatch) {
      const indent = startMatch[1];
      let buf = line;
      let j = i;
      // 合并到闭合 }（同层），支持多行
      while (j < lines.length && !/}\s*(?:from\s+['"][^'"]+['"])?\s*;?\s*$/.test(buf)) {
        j++;
        if (j >= lines.length) break;
        buf += '\n' + lines[j];
        if (j - i > 40) break;
      }
      // 从块中移除 name（支持 type Name 前缀）
      const nameRe = new RegExp(`(?:type\\s+)?${name}(?:\\s+as\\s+[A-Za-z_$][\\w$]*)?`, 'g');
      const cleaned = buf.replace(nameRe, (m) => {
        // 仅当是独立项（前后为 , { } 空白）时才移除
        return m.replace(/^type\s+/i, '') ? m : m; // 占位：实际逻辑在下方
      });
      // 更精确：逐项处理
      const blockBody = buf.slice(buf.indexOf('{') + 1, buf.lastIndexOf('}'));
      const items = blockBody.split(',').map((s) => s.trim()).filter(Boolean);
      const kept = items.filter((it) => {
        const bare = it.replace(/^type\s+/i, '').trim();
        const nm = bare.split(/\s+as\s+/)[0].trim();
        return nm !== name;
      });
      if (kept.length === items.length) {
        // 未移除任何项（可能名字带 type 前缀已剥离不匹配）
        out.push(line);
        i++;
        continue;
      }
      touched = true;
      const newBody = kept.join(', ');
      const fromPart = buf.match(/}\s*(from\s+['"][^'"]+['"])\s*;?\s*$/);
      let newBlock;
      if (kept.length === 0) {
        newBlock = `${indent}// [type-only-remove] ${name} 已移除（空块）`;
      } else {
        newBlock = `${indent}export { ${newBody} }${fromPart ? ' ' + fromPart[1] : ''};`;
      }
      out.push(newBlock);
      i = j + 1;
      continue;
    }
    out.push(line);
    i++;
  }
  const content2 = out.join('\n');
  return { content: content2, touched: touched || content2 !== content };
}

for (const [rel, names] of Object.entries(targets)) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    fails.push({ rel, names, err: 'file not found' });
    console.error(`❌ ${rel} 不存在`);
    continue;
  }
  let content;
  try {
    content = fs.readFileSync(full, 'utf8');
  } catch (e) {
    fails.push({ rel, names, err: e.message });
    continue;
  }
  let orig = content;
  let touchedAny = false;
  for (const name of names) {
    let r1 = stripExportKeyword(content, name);
    if (r1.touched) {
      content = r1.content;
      touchedAny = true;
      continue;
    }
    let r2 = removeFromExportBlock(content, name);
    if (r2.touched) {
      content = r2.content;
      touchedAny = true;
    }
  }
  if (touchedAny) {
    fs.writeFileSync(full, content);
    totalFiles++;
    totalDone += names.length;
    console.log(`✅ ${rel} (${names.length}/${names.length})`);
  } else {
    fails.push({ rel, names, err: 'no pattern matched (可能已是内部声明或形式不识别)' });
    console.log(`⚠️  ${rel} 未匹配（${names.join(', ')}）`);
  }
}

console.log('\n========================================');
console.log(`✅ TYPE-only 保守删除完成：${totalDone} 个导出，涉及 ${totalFiles} 个文件`);
if (fails.length) {
  console.log(`⚠️  未处理 ${fails.length} 个文件：`);
  for (const f of fails.slice(0, 8)) console.log('  ', f.rel, '→', f.err);
}
console.log('💡 下一步：cd apps/web && npx tsc --noEmit');
