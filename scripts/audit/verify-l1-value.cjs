#!/usr/bin/env node
'use strict';

/**
 * L1-VALUE 验证器 v2 — 修复 barrel re-export 漏检
 *
 * 核心修复：不再按 defFiles 路径过滤，改为按行内容过滤。
 * 只跳过"定义行"（export const/let/var/function/class/enum Name），
 * 保留 import、re-export、aggregate 用法等所有真正的引用。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const REPORT = path.join(ROOT, 'scripts', 'audit', 'ts-unused-exports-report.json');
const SEARCH_DIRS = [
  'apps/web/src',
  'apps/desktop/src',
  'apps/mobile/src',
  'packages/shared-components/src',
  'packages/shared-hooks/src',
  'packages/shared-types/src',
  'packages/shared-utils/src',
  'packages/tokens/src',
];

const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const l1Entries = (report.L1 || []).filter(e => e.anyValueExport);

console.log(`L1-VALUE candidates: ${l1Entries.length}`);

const confirmed = [];
const falsePositives = [];
let checked = 0;

/**
 * 判断某行是否为"定义行"（应跳过，不算引用）
 * grep 输出格式为 filepath:linenum:content，用正则提取 content 部分。
 */
function isDefinitionLine(line, name) {
  const escName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 去掉 grep 前缀 filepath:linenum: → 取 content
  // filepath 不含冒号(macOS)，linenum 为纯数字
  const m = line.match(/^[^:]+:\d+:(.*)$/);
  const content = m ? m[1] : line;
  // export const/let/var/function/class/enum Name
  const reDef = new RegExp(`^\\s*export\\s+(?:const|let|var|function|class|enum)\\s+${escName}\\b`);
  // export default Name;  (仅裸标识符)
  const reDefault = new RegExp(`^\\s*export\\s+default\\s+${escName}\\s*;?\\s*$`);
  return reDef.test(content) || reDefault.test(content);
}

for (const entry of l1Entries) {
  const name = entry.name;
  checked++;
  if (checked % 50 === 0) console.log(`  progress: ${checked}/${l1Entries.length}`);

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const realRefs = [];

  for (const dir of SEARCH_DIRS) {
    const fullPath = path.join(ROOT, dir);
    if (!fs.existsSync(fullPath)) continue;

    try {
      // macOS BSD grep 不支持 -P (Perl regex)，改用 -E (extended) + \< \> word boundary
      const result = execSync(
        `grep -rnE '\\<${escapedName}\\>' --include='*.ts' --include='*.tsx' '${fullPath}' 2>/dev/null || true`,
        { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
      ).trim();

      if (result) {
        for (const line of result.split('\n')) {
          if (!line.trim()) continue;
          if (isDefinitionLine(line, name)) continue;
          realRefs.push(line.trim().slice(0, 150));
        }
      }
    } catch { /* skip */ }
  }

  if (realRefs.length > 0) {
    falsePositives.push({
      name,
      defFile: (entry.defFiles || [])[0],
      refCount: realRefs.length,
      samples: realRefs.slice(0, 3),
    });
  } else {
    confirmed.push({ name, defFile: (entry.defFiles || [])[0] });
  }
}

console.log(`\nConfirmed dead: ${confirmed.length}, False positives: ${falsePositives.length}`);

const confirmedFile = path.join(ROOT, 'scripts', 'audit', 'l1-confirmed-dead.tsv');
fs.writeFileSync(confirmedFile, confirmed.map(e => `${e.name}\t${e.defFile}`).join('\n'));
console.log(`Confirmed list -> ${confirmedFile}`);

const fpFile = path.join(ROOT, 'scripts', 'audit', 'l1-false-positives.json');
fs.writeFileSync(fpFile, JSON.stringify(falsePositives, null, 2));
console.log(`False positives -> ${fpFile}`);

const dirs = {};
for (const e of confirmed) {
  const parts = (e.defFile || '').split('/');
  const key = parts.slice(0, 4).join('/');
  dirs[key] = (dirs[key] || 0) + 1;
}
console.log('\nConfirmed dead by directory:');
Object.entries(dirs).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`  ${k}: ${v}`);
});

// 生成 batch JSON
const targets = {};
for (const e of confirmed) {
  if (!e.defFile) continue;
  if (!targets[e.defFile]) targets[e.defFile] = [];
  targets[e.defFile].push(e.name);
}
const batch = {
  total_exports: confirmed.length,
  total_files: Object.keys(targets).length,
  targets,
};
const batchFile = path.join(ROOT, 'scripts', 'audit', 'l1-batch-confirmed.json');
fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2));
console.log(`Batch file -> ${batchFile}`);
