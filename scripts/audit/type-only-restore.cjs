#!/usr/bin/env node
/**
 * type-only-restore.cjs — 恢复 L2 类型导出的 export 标记（保留 L1 删除）
 * 仅处理与 L1 重叠的 5 个文件：将 decl 形式 `type|interface Name` 加回 `export ` 前缀。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/xingzhai/TOPEMS';
const OVERLAP = [
  'apps/web/src/api/ai/businessIntelligence.ts',
  'apps/web/src/hooks/bff/useIsr.ts',
  'apps/web/src/lib/sseClient.ts',
  'apps/web/src/utils/listParamMapping.ts',
  'apps/web/src/utils/streamingSsr.ts',
];
const L2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/audit', 'type-only-l2.json'), 'utf8'));

let done = 0;
for (const f of OVERLAP) {
  const names = L2.filter((x) => x.defFile === f).map((x) => x.name);
  const full = path.join(ROOT, f);
  let content = fs.readFileSync(full, 'utf8');
  let touched = false;
  for (const n of names) {
    const re = new RegExp('^(\\s*)(type|interface)\\s+' + n + '\\b', 'm');
    const m = content.match(re);
    if (m) {
      content = content.replace(re, (mm, indent, kw) => `${indent}export ${kw} ${n}`);
      touched = true;
      done++;
      console.log(`✅ ${f.split('/').slice(-2).join('/')} → export ${n}`);
    } else {
      console.log(`⚠️  ${f.split('/').slice(-2).join('/')} ${n} 未匹配 decl（需人工）`);
    }
  }
  if (touched) fs.writeFileSync(full, content);
}
console.log(`\n恢复完成：${done} 项（重叠文件）`);
