#!/usr/bin/env node
/**
 * multi-restore.cjs — 回滚 multi-file 批删除（保留之前批次的删除）
 * 对 batch targets 的每个 (file, name)：从 git show HEAD:file 提取该名字的原始 export 形式，
 * 应用到当前文件——decl 加回 export 前缀；export 块/reexport 加回名字。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = '/Users/xingzhai/TOPEMS';
const arg = process.argv.find((a) => a.startsWith('--batch='));
const BATCH = JSON.parse(fs.readFileSync(path.join(ROOT, arg.split('=')[1]), 'utf8'));
const targets = BATCH.targets;

let done = 0;
for (const [rel, names] of Object.entries(targets)) {
  const full = path.join(ROOT, rel);
  const headSrc = execSync(`git show HEAD:${rel}`, { encoding: 'utf8', maxBuffer: 1e8 });
  let cur = fs.readFileSync(full, 'utf8');
  let touched = false;
  for (const name of names) {
    // 1) decl 形式：export const|function|class|enum Name —— 当前若有 `const Name`（无 export）→ 加回
    const declRe = new RegExp(`export\\s+(?:async\\s+)?(const|let|var|function|class|enum)\\s+${name}\\b`, 'm');
    const headDecl = headSrc.match(declRe);
    if (headDecl) {
      const curRe = new RegExp(`^(\\s*)(?:async\\s+)?(const|let|var|function|class|enum)\\s+${name}\\b`, 'm');
      if (curRe.test(cur) && !new RegExp(`export\\s+(?:async\\s+)?(?:const|let|var|function|class|enum)\\s+${name}\\b`, 'm').test(cur)) {
        cur = cur.replace(curRe, (m, indent, kw) => `${indent}export ${kw} ${name}`);
        touched = true;
        done++;
        continue;
      }
    }
    // 2) 块形式（本地/reexport）：HEAD 有 `export { ... name ... } [from 'x']` —— 当前块缺 → 加回
    const blockRe = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}(?:\\s+from\\s+['"][^'"]+['"])?`, 'm');
    const headBlock = headSrc.match(blockRe);
    if (headBlock) {
      const curBlockRe = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}(?:\\s+from\\s+['"][^'"]+['"])?`, 'm');
      if (!curBlockRe.test(cur)) {
        // 找当前最近的 export {} 块加回（保守：只处理单行块）
        const curSingle = cur.match(/^(\s*)export(\s+type)?\s*\{([^}]*?)\}\s*(?:from\s+(['"][^'"]+['"]))?\s*;?$/m);
        if (curSingle) {
          const [, indent, , body, fromPart] = curSingle;
          const fromSuffix = fromPart ? ` from ${fromPart}` : '';
          const newBody = body.trim() ? body.trim() + ', ' + name : name;
          cur = cur.replace(curSingle[0], `${indent}export { ${newBody} }${fromSuffix};`);
          touched = true;
          done++;
        } else {
          // 多行块或无法定位——用 HEAD 的完整块行（精确重建该名字的 reexport 行）
          const headLine = headSrc.split('\n').find((l) => new RegExp(`\\b${name}\\b`).test(l) && /export\s*\{/.test(l));
          if (headLine) {
            // 在该名字原文件位置的 export 块后追加独立 reexport 行（保守：附加到文件末尾 export 区）
            cur += `\n${headLine.trim()}`;
            touched = true;
            done++;
          }
        }
        continue;
      }
    }
  }
  if (touched) fs.writeFileSync(full, cur);
}
console.log(`✅ multi 恢复完成：${done} 项 / ${Object.keys(targets).length} 文件`);
