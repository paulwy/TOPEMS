#!/usr/bin/env node
/**
 * tmp-v257-v5fix.cjs
 *
 * 修复 v5 apply 之后的 2 个 bug：
 *  A) XX_PATHS 定义块整体被删除（v5 拼文件时 SRC.slice(0, PATHS_MATCH.index) 切早了）
 *  B) 错误新增了类型中不存在的 templateType 字段（已完成 9 模块只用 template，types.ts 也无 templateType）
 */
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const MODULES = process.argv.slice(2).filter(m => m && m.length < 20);
if (MODULES.length === 0) {
  console.error('用法: node tmp-v257-v5fix.cjs erp bi rd oa ai workflow');
  process.exit(1);
}

const WEB_ROOT = path.resolve(__dirname, '..', 'apps', 'web', 'src');
function findConfig(m) {
  const direct = path.join(WEB_ROOT, 'modules', m, 'config.ts');
  if (fs.existsSync(direct)) return direct;
  const alts = fs.readdirSync(path.join(WEB_ROOT, 'modules')).filter(d => d.toLowerCase().includes(m.toLowerCase()));
  for (const a of alts) {
    const c = path.join(WEB_ROOT, 'modules', a, 'config.ts');
    if (fs.existsSync(c)) return c;
  }
  return null;
}

let fails = 0;
for (const m of MODULES) {
  const cfg = findConfig(m);
  if (!cfg) { console.error(`[${m}] ❌ 找不到 config.ts`); fails++; continue; }
  const current = fs.readFileSync(cfg, 'utf8');
  // -------- B fix：先删除 templateType: "xxx", 行（允许任意字符串值）----------
  const linesA = current.split(/\r?\n/);
  const beforeB = linesA.length;
  const linesB = linesA.filter(l => !/^\s*templateType\s*:\s*['"`].*['"`]\s*,?\s*$/.test(l));
  const removedTplT = beforeB - linesB.length;

  // -------- A fix：取 git HEAD 中该文件的 PATHS 定义块，然后写回对应位置 --------
  let gitSrc;
  try {
    gitSrc = execSync(`git show HEAD:${path.relative(process.cwd(), cfg)}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    console.error(`[${m}] ❌ git show HEAD:${cfg} 失败，无法恢复 PATHS 定义块`);
    fails++;
    continue;
  }
  const pathsBlockM = gitSrc.match(/export const [A-Z][A-Z0-9_]*_PATHS\s*=\s*\{[\s\S]*?\}\s+as\s+const\s*;/);
  if (!pathsBlockM) {
    console.error(`[${m}] ❌ git HEAD 文件中无法用正则抽出 PATHS 定义块`);
    fails++;
    continue;
  }
  const pathsBlock = pathsBlockM[0];
  const pathsName = pathsBlock.match(/export const ([A-Z][A-Z0-9_]*_PATHS)/)[1];

  let merged = linesB.join('\n');
  // 精确插入锚点：下一行是 "// 组件中应引用 ${pathsName}.xxx，而非硬编码字符串" 之后紧接空行 → 用正则替换
  // 如果没有那行注释，就退到紧跟在 "// ---- 路径常量：唯一真相源 ----" 注释后面
  const reAnchor1 = new RegExp(
    `(\\/\\/\\s*---- 路径常量：唯一真相源 ----\\s*\\n\\/\\/\\s*组件中应引用\\s+${pathsName}\\.xxx，而非硬编码字符串\\s*\\n)`
  );
  let matchCount = 0;
  if (reAnchor1.test(merged)) {
    merged = merged.replace(reAnchor1, (_m, header) => `${header}\n${pathsBlock}\n`);
    matchCount = 1;
  } else {
    // 退 2：仅 "路径常量：唯一真相源" 后
    const reAnchor2 = /(\/\/\s*---- 路径常量：唯一真相源 ----\s*\n)/;
    if (reAnchor2.test(merged)) {
      merged = merged.replace(reAnchor2, (_m, header) => `${header}\n${pathsBlock}\n`);
      matchCount = 1;
    } else {
      // 退 3：紧跟在 import 块结束后的第一段注释前
      const reAnchor3 = /(import[^\n]*\n\n)/;
      if (reAnchor3.test(merged)) {
        const idx = merged.search(reAnchor3) + RegExp.lastMatch.length;
        merged = merged.slice(0, idx) + `\n${pathsBlock}\n` + merged.slice(idx);
        matchCount = 1;
      }
    }
  }

  // --------- 最终 sanity check ---------
  const sanityLines = merged.split(/\r?\n/);
  const newPathsCount = (merged.match(new RegExp(`^export const ${pathsName}\\s*=\\s*\\{`, 'm')) ? 1 : 0) +
                        (merged.match(/\}\s+as\s+const\s*;/m) ? 1 : 0);
  const hasPathsNameRefs = (merged.match(new RegExp(`\\b${pathsName}\\.\\w+`, 'g')) || []).length;
  const tplTLeft = sanityLines.filter(l => /templateType\s*:/.test(l)).length;
  if (matchCount === 0 || newPathsCount < 2 || tplTLeft > 0) {
    console.error(`[${m}] ❌ sanity 失败：match=${matchCount} newPathsCount=${newPathsCount}（需≥2） pathsRefs=${hasPathsNameRefs} tplTLeft=${tplTLeft}（需=0）`);
    console.error('  → 文件未被写回，请排查。');
    fails++;
    continue;
  }

  // 写回
  fs.writeFileSync(cfg, merged, 'utf8');
  console.log(`[${m}] ✅ 修复：PATHS 定义块已写回（引用数=${hasPathsNameRefs}）；删除 templateType 行 = ${removedTplT}`);
}

console.log('\n===== 修复完成：成功 = ' + (MODULES.length - fails) + ' / 失败 = ' + fails + ' =====');
if (fails > 0) process.exit(2);
