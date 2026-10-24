#!/usr/bin/env node
/**
 * TS Unused Export Detector (L1/L2/L3 分级)
 *
 * 快速 grep-based 方案：扫描 apps/web/src 的命名导出，全仓统计引用次数。
 * L1-SAFE:    0 处 import（且 barrel 未 re-export）
 * L2-CAUTION: 仅 barrel/test/storybook 引用
 * L3-HOLD:    被页面/组件/配置实际引用
 *
 * 速度优先，先跑第一轮粗筛，人工交叉验证 L1 候选再删除。
 *
 * === V258 清理完成后说明 ===
 *
 * 本报告驱动了 V258 阶段的三轮清理（均已 Push 到 main）：
 *
 * Phase 1 — L1-SAFE VALUE（×16 目录批次）：
 *   90 def-side `export` keyword 去除 + 105 barrel aggregate re-export names 清除
 *   工具：scripts/audit/l1-conservative-remove-v2.cjs
 *
 * Phase 2 — L2-CAUTION VALUE（×2 批次）：
 *   ~23 条 dead VALUE chains（6 条假阳性回滚）
 *   工具：scripts/audit/l2-batch2-scan.py（strip comments/strings + barrel-local usage 严格过滤）
 *
 * Phase 3 — TYPE-only（×12 批次）：
 *   2601 条 net dead TYPE exports（6 条回滚：5 wms _mock.ts + 1 api6 RequestPriority）
 *   工具：scripts/audit/type-only-scan.py + scripts/audit/type-only-remove.py
 *
 * 合计 ≈ 2814 条 dead exports 清理，TSC apps/web 每批 0 errors Gate。
 *
 * 已知假阳性模式（回滚策略）：
 *   1. Barrel 内 aggregate object 赋值 → `const api = { system: systemApi }` 是 ALIVE
 *   2. `_mock.ts` 下划线前缀文件被默认跳过 → 需加 `--no-skip-underscore` 或手动验证
 *   3. 同文件 type+class 命名冲突 → 去 `export` 触发 TS2300 Duplicate Identifier
 *
 * 剩余 ALIVE（不可删）：
 *   - 255 条 VALUE（barrel 本地 aggregate 构造，如 `const erpApi = { addressbookApi, ... }`）
 *   - 1367 条 TYPE（barrel 本地 namespace/type alias 构造）
 *
 * === 后续使用 ===
 *
 * 1. 新增导出后重跑 `node scripts/audit/detect-ts-unused-exports.cjs` 生成最新报告
 * 2. L1 VALUE 候选 → scripts/audit/l1-conservative-remove-v2.cjs 批量去除
 * 3. L2 VALUE 候选 → scripts/audit/l2-batch2-scan.py 严格死链重检 → conservative-remove-v2
 * 4. TYPE-only 候选 → scripts/audit/type-only-scan.py → type-only-remove.py
 * 5. 每批执行后必须 TSC Gate：`cd apps/web && pnpm typecheck` → 0 errors 才提交
 * 6. 出现 TS2459/TS2724/TS2304 → 消费端有真实引用，立即整链回滚
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB_SRC = path.join(ROOT, 'apps', 'web', 'src');

const EXCLUDE_DIR = new Set([
  'node_modules',
  'dist',
  'build',
  '__tests__',
  '__mocks__',
  '__fixtures__',
  '.next',
  'coverage',
]);
const EXCLUDE_FILE_EXT = new Set(['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.stories.tsx', '.d.ts']);

// 约定文件保护：被 CLI 按约定目录读取、不经 import 引用的文件（扫描器看不到其引用方）。
// 若误入 L1/L2 删除候选，会触发误删。历史记录：storybook 配置已被误删 3 次
// （11d250f3b / 1b5cefce4 / 2026-10 工作区），本集合为显式防复发护栏。
// 路径为相对 ROOT 的后缀；命中即归入 L3-HOLD，绝不进 L1/L2。
const CONVENTION_PRESERVE_SUFFIX = [
  '/theme/storybook-theme.ts', // 仅被 .storybook/preview.tsx 引用（.storybook 在 src 外，扫描不可见）
  '/storybook-theme.ts',
];

function walk(dir, out = [], includeTests = false) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    // includeTests=true 时（引用索引遍历）不排除 __tests__/__mocks__/__fixtures__ 与测试文件：
    // 测试文件/目录是"引用方"，其 import 必须计入 refCount，否则 L1 会把被测试引用的导出误判为未使用。
    if (!includeTests && EXCLUDE_DIR.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out, includeTests);
    else if (e.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) {
      let skip = false;
      if (!includeTests) {
        for (const ext of EXCLUDE_FILE_EXT)
          if (e.name.endsWith(ext)) {
            skip = true;
            break;
          }
      }
      if (!skip) out.push(full);
    }
  }
  return out;
}

/**
 * 提取单文件的命名导出（不含 default, 不含 export = ...）
 * 返回 [{ kind, name, startLine, isTypeOnly, isReExport, fromPath? }]
 */
function extractExports(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const exports = [];
  let i = 0;

  // 1. export const/class/function/enum/type/interface/abstract class Foo
  //    [v7] 支持 async：export async function X 此前漏定义（declRe 无 async 分支）→ defFiles 空 → 误判孤儿转发
  const declRe =
    /^\s*export\s+(declare\s+)?(?:abstract\s+)?(?:async\s+)?(type|interface|enum|const|let|var|function|class|namespace)\s+(\w+)/;
  const declRe2 = /^\s*export\s+\{\s*([^}]+?)\s*\}(?:\s+from\s+['"]([^'"]+)['"])?\s*;?\s*$/;
  // 2. export { A, B as C } 或 export { A } from './x'
  while (i < lines.length) {
    let line = lines[i];
    // 跳过块注释
    if (/^\s*\/\*/.test(line)) {
      while (i < lines.length && !/\*\//.test(lines[i])) i++;
      i++;
      continue;
    }
    // 跳过行注释
    if (/^\s*\/\//.test(line)) {
      i++;
      continue;
    }

    let m = line.match(declRe);
    if (m) {
      const kind = m[2];
      const name = m[3];
      const isTypeOnly = kind === 'type' || kind === 'interface';
      exports.push({ kind, name, startLine: i + 1, isTypeOnly, isReExport: false });
      i++;
      continue;
    }

    // 处理 export { A, B as C } [from 'x'] - 可能跨多行
    // 合并多行到第一个 }; 出现
    if (/\bexport\s*\{/.test(line) && !/^\s*export\s+default\b/.test(line)) {
      let buf = line;
      let j = i;
      while (j < lines.length && !/\}/.test(buf)) {
        j++;
        buf += ' ' + (lines[j] || '');
        if (j - i > 20) break;
      }
      const m2 = buf.match(/export\s*\{\s*([^}]+?)\s*\}(?:\s+from\s+['"]([^'"]+)['"])?/);
      if (m2) {
        const parts = m2[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const p of parts) {
          const [origName, , alias] = p.split(/\s+/); // A as B => A, as, B
          const name = alias || origName;
          if (!name || name.startsWith('type ')) continue; // 跳过 type-only 的标记，实际名字在后面
          // 处理 "type Foo"
          let cleanName = name.replace(/^type\s+/, '');
          const typeOnly = /^type\s+/.test(name);
          exports.push({
            kind: typeOnly ? 'type-reexport' : 'reexport',
            name: cleanName,
            startLine: i + 1,
            isTypeOnly: typeOnly,
            isReExport: true,
            fromPath: m2[2] || null,
            origName: origName ? origName.replace(/^type\s+/, '') : cleanName,
          });
        }
        i = j + 1;
        continue;
      }
    }

    i++;
  }
  return exports;
}

/**
 * [v6] 词法器：从源码提取标识符，剥离行/块注释与字符串字面量。
 * 修复历史盲区：reverseIndex 曾把注释/字符串里的标识符计入引用 → 虚高 refCount → 假 L3。
 * 模板字符串：引号内字符跳过，${...} 内的标识符是活引用（退出引号态后按普通代码扫描）。
 */
function extractIdentifiers(src) {
  const out = new Set();
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === q) { i++; break; }
        if (q === '`' && src[i] === '$' && src[i + 1] === '{') break;
        i++;
      }
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      out.add(src.slice(i, j));
      i = j;
      continue;
    }
    i++;
  }
  return out;
}

function main() {
  // CLI args
  const args = process.argv.slice(2);
  const noSkipUnderscore = args.includes('--no-skip-underscore');
  const dirArgs = args.filter(a => a.startsWith('--dir=')).map(a => a.split('=')[1]);
  const extraDirs = dirArgs.map(d => path.join(ROOT, d));

  console.log('\n🔍 扫描文件...');
  const scanDirs = [WEB_SRC, ...extraDirs];
  let files = [];
  for (const dir of scanDirs) {
    files = files.concat(walk(dir));
  }
  console.log(`   文件数: ${files.length} (扫描目录: ${scanDirs.length})`);

  // 引用索引遍历：含测试文件/目录 + 额外引用方（apps/web/tests、packages/*）
  // 这些文件只作为"引用方"进入 reverseIndex，其导出不进入候选（避免测试 helper/包导出误删）。
  const indexFiles = [...files];
  for (const dir of scanDirs) indexFiles.push(...walk(dir, [], true));
  const EXTRA_REF_DIRS = [
    path.join(ROOT, 'apps', 'web', 'tests'),
    path.join(ROOT, 'apps', 'web', 'e2e'),
    ...fs.readdirSync(path.join(ROOT, 'packages'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(ROOT, 'packages', e.name)),
  ];
  for (const dir of EXTRA_REF_DIRS) {
    if (fs.existsSync(dir)) indexFiles.push(...walk(dir, [], true));
  }

  // phase 1: 收集所有 exports
  console.log('\n📦 阶段 1/3  提取 exports ...');
  /** name -> { file, kind, isTypeOnly, count }[] */
  const exportMap = new Map();
  let totalExports = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const exps = extractExports(f);
    for (const e of exps) {
      e.file = rel;
      // 忽略 default
      if (e.name === 'default') continue;
      if (!exportMap.has(e.name)) exportMap.set(e.name, []);
      exportMap.get(e.name).push(e);
      totalExports++;
    }
  }
  console.log(`   命名导出数: ${totalExports} (去重名后 ${exportMap.size})`);

  // [v8] 分离式定义识别：const X = ...; export { X }（本地转发且同文件存在裸定义行）→ 计为定义。
  // 修复盲区：storage.ts 的 `class LocalStorage {...} export { LocalStorage }` 此前 defFiles 空 → 误判孤儿转发。
  for (const [, es] of exportMap) {
    for (const e of es) {
      if (!e.isReExport || e.fromPath) continue;
      let src;
      try {
        src = fs.readFileSync(path.join(ROOT, e.file), 'utf8');
      } catch {
        continue;
      }
      const re = new RegExp(
        '^(?:declare\\s+)?(?:abstract\\s+)?(?:async\\s+)?(?:type|interface|enum|const|let|var|function|class|namespace)\\s+' +
          e.origName + '\\b',
        'm'
      );
      if (re.test(src)) {
        e.isReExport = false;
        e.kind = 'const'; // 保守标注种类（定义行种类不一，仅用于 defFiles 归属）
      }
    }
  }

  // phase 2: 构建反向引用索引（每个标识符出现在哪些文件）
  console.log('\n📦 阶段 2/3  构建反向引用索引...');
  const reverseIndex = new Map(); // name -> Set<file>
  for (const f of indexFiles) {
    let src;
    try {
      src = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    // [v6] 剥离注释/字符串后的标识符（修复注释/字符串虚引盲区）
    const ids = extractIdentifiers(src);
    const rel = path.relative(ROOT, f);
    for (const id of ids) {
      if (!reverseIndex.has(id)) reverseIndex.set(id, new Set());
      reverseIndex.get(id).add(rel);
    }
  }

  // [v4] 别名链索引：export { X as Y } → 页面 import Y 算消费（Y 的引用方合并到 X）
  const aliasMap = new Map(); // Y -> X（Y 是 X 的别名）
  for (const f of indexFiles) {
    let src2;
    try { src2 = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const reEx = /export\s*\{([^}]+)\}\s*(?:from\s*'[^']+')?/g;
    let em;
    while ((em = reEx.exec(src2)) !== null) {
      for (const part of em[1].split(',')) {
        const pm = part.trim().match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (pm) {
          if (!aliasMap.has(pm[2])) aliasMap.set(pm[2], pm[1]);
        }
      }
    }
  }

  // phase 3：分级输出
  console.log('\n📦 阶段 3/3  分级中...');
  const L1 = []; // SAFE: 仅自身文件有引用 → 0 处引用
  const L2 = []; // CAUTION: 仅 barrel/test/story
  const L3 = []; // HOLD: 实际使用
  const L3Dead = []; // [v5] 死链候选：真实消费方均为孤儿文件

  // [v5] 文件 → 命名导出 索引（惰性构建一次）
  let fileToExports = null;

  for (const [name, exps] of exportMap) {
    // 候选定义文件集合
    const defFiles = new Set(exps.filter((e) => !e.isReExport).map((e) => e.file));
    const reffingFiles = reverseIndex.get(name) || new Set();

    // 真实引用文件数 = 出现的所有文件 - 定义文件
    const realRefFiles = new Set([...reffingFiles].filter((f) => !defFiles.has(f)));
    // [v4] 别名消费合并：name 若有别名 Y 被引用 → 合并引用方（页面 import Y 算消费）
    for (const [alias, orig] of aliasMap) {
      if (orig === name) {
        const aliasRefs = reverseIndex.get(alias) || new Set();
        for (const rf of aliasRefs) realRefFiles.add(rf);
      }
    }

    // 类型导出的 L1 判定更严格：类型可以出现在 type-only import，TS 可能在 tsc 时用
    // 先只对 值导出（const/function/class/enum/非 type-only reexport）做严格 L1
    const anyValueExport = exps.some(
      (e) =>
        e.kind === 'const' ||
        e.kind === 'let' ||
        e.kind === 'var' ||
        e.kind === 'function' ||
        e.kind === 'class' ||
        (e.kind === 'enum' && !e.isTypeOnly) ||
        (e.isReExport && !e.isTypeOnly)
    );
    const anyTypeExport = exps.some((e) => e.isTypeOnly || e.kind === 'type' || e.kind === 'interface');

    let level;
    if (realRefFiles.size === 0) {
      level = 'L1';
    } else {
      // L2: 全部引用文件都符合 barrel/test/story/mock
      let allL2 = true;
      for (const rf of realRefFiles) {
        const isBarrel = /\/index\.ts$/.test(rf); // [v4] index.tsx 是页面/组件入口 → 真实引用，不算 barrel
        const isTest = /__tests__|\.(test|spec)\.(ts|tsx)$/.test(rf);
        const isStory = /\.stories\.(ts|tsx)$/.test(rf);
        const isMock = noSkipUnderscore
          ? /__mocks__\//.test(rf)
          : /__mocks__|mock\.ts/.test(rf);
        if (!isBarrel && !isTest && !isStory && !isMock) {
          allL2 = false;
          break;
        }
      }
      level = allL2 ? 'L2' : 'L3';
    }


    // [v2] 两级聚合消费链升级：L2 候选若被「有外部消费的聚合对象」引用成员 → 升 L3（活）
    // （修复历史误判：barrel re-export 文件曾计入 defFiles 被扣除，导致聚合对象成员误报 L1）
    if (level === 'L2') {
      let promoted = false;
      for (const rf of realRefFiles) {
        if (!/\/index\.(ts|tsx)$/.test(rf)) continue;
        let bSrc;
        try { bSrc = fs.readFileSync(path.join(ROOT, rf), 'utf8'); } catch { continue; }
        const aggRe = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;
        let am;
        while ((am = aggRe.exec(bSrc)) !== null) {
          const aggName = am[1];
          const after = bSrc.slice(am.index);
          const mEnd = after.search(/\n\s*\};/);
          const body = mEnd > -1 ? after.slice(0, mEnd) : after;
          if (new RegExp('\\b' + name + '\\b').test(body)) {
            const aggRefs = reverseIndex.get(aggName) || new Set();
            const extRef = [...aggRefs].some((rf2) => !/\/index\.(ts|tsx)$/.test(rf2) && rf2 !== rf);
            if (extRef) { promoted = true; break; }
          }
        }
        if (promoted) break;
      }
      if (promoted) level = 'L3';
    }

    const record = {
      name,
      level,
      totalExports: exps.length,
      defFiles: [...defFiles],
      refCount: realRefFiles.size,
      sampleRefs: [...realRefFiles].slice(0, 5),
      anyValueExport,
      anyTypeExport,
    };

    // [v5] L3 死链降级：真实消费方全部为孤儿文件（该文件自身的导出无任何外部真实消费）
    // 单层 + barrel 一层：孤儿判定排除 barrel/test/story/mock/自身/本项 defFiles；
    // 保守规则：纯 side-effect 文件（无命名导出）不判死；结论仅候选，删除前必须人工核验。
    if (level === 'L3') {
      const isSpecial = (f) =>
        /\/index\.(ts|tsx)$/.test(f) ||
        /__tests__|\.(test|spec)\.(ts|tsx)$/.test(f) ||
        /\.stories\.(ts|tsx)$/.test(f) ||
        (/__mocks__|mock\.ts/.test(f));
      const realConsumers = [...realRefFiles].filter((rf) => !isSpecial(rf) && !defFiles.has(rf));
      if (realConsumers.length > 0) {
        if (!fileToExports) {
          fileToExports = new Map();
          for (const [nm, es] of exportMap) {
            for (const e of es) {
              if (e.isReExport) continue;
              if (!fileToExports.has(e.file)) fileToExports.set(e.file, new Set());
              fileToExports.get(e.file).add(nm);
            }
          }
        }
        const isOrphanFile = (f) => {
          const names = fileToExports.get(f);
          if (!names || names.size === 0) return false; // 纯 side-effect 文件，保守不判
          for (const n of names) {
            const direct = new Set(
              [...(reverseIndex.get(n) || [])].filter((rf) => rf !== f && !defFiles.has(rf) && !isSpecial(rf))
            );
            if (direct.size > 0) return false;
            // barrel 一层：经 index 转发的引用方再看一层
            const barrelRefs = new Set(
              [...(reverseIndex.get(n) || [])].filter((rf) => /\/index\.(ts|tsx)$/.test(rf) && rf !== f)
            );
            for (const b of barrelRefs) {
              const bNames = fileToExports.get(b) || new Set();
              for (const bn of bNames) {
                const brefs = new Set(
                  [...(reverseIndex.get(bn) || [])].filter((rf) => rf !== b && !defFiles.has(rf) && !isSpecial(rf))
                );
                if (brefs.size > 0) return false;
              }
            }
          }
          return true;
        };
        if (realConsumers.every(isOrphanFile)) {
          record.level = 'L3_DEAD';
          record.deadReason = '真实消费方均为孤儿文件（死链）';
          record.consumerFiles = [...realConsumers];
        }
      }
    }

    // [v3] 同文件消费识别：定义文件内「使用次数 > 定义/export块次数」→ 算消费（new X() 实例、类内部静态调用、函数内部引用）
    if (level === 'L1' || level === 'L2') {
      let sameFile = false;
      for (const df of defFiles) {
        let bSrc;
        try { bSrc = fs.readFileSync(path.join(ROOT, df), 'utf8'); } catch { continue; }
        const re = new RegExp('\\b' + name + '\\b', 'g');
        let total = 0, m;
        while ((m = re.exec(bSrc)) !== null) total++;
        const defRe = new RegExp('^export\\s+(?:default\\s+)?(?:const|function|class|interface|type|enum)\\s+' + name + '\\b', 'gm');
        let defs = 0;
        while (defRe.exec(bSrc)) defs++;
        const blkRe = new RegExp('export\\s*\\{[^}]*\\b' + name + '\\b[^}]*\\}', 'g');
        let blks = 0;
        while (blkRe.exec(bSrc)) blks++;
        if (total - defs - blks > 0) { sameFile = true; break; }
      }
      if (sameFile) level = 'L3';
    }

    // 约定文件保护：命中 CONVENTION_PRESERVE_SUFFIX 则归 L3-HOLD，绝不进 L1/L2 删除候选。
    const isConventionPreserved = [...defFiles].some((df) =>
      CONVENTION_PRESERVE_SUFFIX.some((s) => df.endsWith(s))
    );
    if (isConventionPreserved) {
      L3.push(record);
    } else if (level === 'L1') L1.push(record);
    else if (level === 'L2') L2.push(record);
    else if (level === 'L3_DEAD') L3Dead.push(record);
    else L3.push(record);
  }

  // 聚合结果
  const l1Values = L1.filter((r) => r.anyValueExport);
  const l1Types = L1.filter((r) => !r.anyValueExport && r.anyTypeExport);
  const l2Values = L2.filter((r) => r.anyValueExport);
  const l2Types = L2.filter((r) => !r.anyValueExport && r.anyTypeExport);

  console.log('\n📊 结果汇总 =================================');
  console.log(`   L1-SAFE  总数     : ${L1.length}`);
  console.log(`     其中值导出      : ${l1Values.length}  ← 可优先删除试点`);
  console.log(`     其中类型导出    : ${l1Types.length}`);
  console.log(`   L2-CAUTION 总数   : ${L2.length}`);
  console.log(`     其中值导出      : ${l2Values.length}`);
  console.log(`     其中类型导出    : ${l2Types.length}`);
  console.log(`   L3-HOLD    总数   : ${L3.length}`);
  console.log(`   L3-DEAD    死链候选: ${L3Dead.length}  ← L3 深化候选（删除前必须人工核验）`);
  console.log();

  // 写 JSON
  const outDir = path.join(ROOT, 'scripts', 'audit');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'ts-unused-exports-report.json');
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        filesScanned: files.length,
        totalNamedExports: totalExports,
        uniqueExportNames: exportMap.size,
        summary: {
          L1: { total: L1.length, values: l1Values.length, types: l1Types.length },
          L2: { total: L2.length, values: l2Values.length, types: l2Types.length },
          L3: { total: L3.length, dead: L3Dead.length },
        },
        L1,
        L2,
        L3Dead,
      },
      null,
      2
    )
  );
  console.log(`💾 完整 JSON: ${path.relative(ROOT, outFile)}`);

  // 打印 L1 值导出前 60 条（优先删除候选）
  console.log('\n🎯 L1-SAFE 值导出（推荐优先删除试点，前 60 条）:');
  console.log('   文件                                                   | 名称                | 种类');
  console.log('   ─────────────────────────────────────────────────────────────────────────');
  for (const r of l1Values.slice(0, 60)) {
    const file = r.defFiles[0].padEnd(56).slice(0, 56);
    const name = r.name.padEnd(20).slice(0, 20);
    const exps = exportMap.get(r.name);
    const kind = exps[0].kind;
    console.log(`   ${file}| ${name}| ${kind}`);
  }
  if (l1Values.length > 60) console.log(`   ... 还有 ${l1Values.length - 60} 条见 JSON`);

  console.log('\n✅ 探测完成，下一步执行：');
  console.log('   1. 人工 spot-check L1 值导出候选（确保不是 string-literal 反射引用）');
  console.log('   2. 选 20-50 项做第一批删除 → tsc 验证 Gate');
  console.log();
}

main();
