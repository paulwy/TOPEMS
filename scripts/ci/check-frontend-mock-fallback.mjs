#!/usr/bin/env node
/**
 * 前端 mock 兜底门禁（TODO §1.F F11）
 *
 * 目标：生产构建路径禁止“API 失败就回退假数据”——失败必须显式报错。
 * 做法：扫描 apps/web/src 下的非测试源码，命中以下模式即记为违规：
 *   1. `mock<Upper>...` 形式的 mock 数据/适配器标识（mockOrders / mockApiAdapter / mockCustomers ...）
 *   2. “已降级为本地模拟数据” 之类的降级文案
 *   3. `.mock_banner` / `isMockData` 这类 mock 演示态开关
 * 测试文件（__tests__、*.test.*、*.spec.*）不计入。
 *
 * 存量债务登记在 scripts/ci/frontend-mock-fallback-baseline.json：
 *   - 新出现的违规 → 红（必须修代码，不能改基线绕过）
 *   - 基线里已消失的键 → 红（陈旧条目必须核销，保证基线只减不增）
 * 用法：
 *   node scripts/ci/check-frontend-mock-fallback.mjs               # 校验
 *   node scripts/ci/check-frontend-mock-fallback.mjs --update-baseline  # 人工核销（仅削减）
 *   node scripts/ci/check-frontend-mock-fallback.mjs --root <dir>  # 指定扫描根（自测用）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const baselinePath = path.join(__dirname, 'frontend-mock-fallback-baseline.json');

const args = process.argv.slice(2);
const updateBaseline = args.includes('--update-baseline');
const rootArgIndex = args.indexOf('--root');
const scanRoot =
  rootArgIndex >= 0 && args[rootArgIndex + 1]
    ? path.resolve(args[rootArgIndex + 1])
    : path.join(repoRoot, 'apps/web/src');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '__tests__']);
const SKIP_FILE = /\.(test|spec)\.[jt]sx?$/;

const PATTERNS = [
  // 只抓“API 失败就回退假数据”的形态；stories / env 开关式 demo mock 不算
  { id: 'mock-fallback-return', re: /\breturn\s+mock[A-Z][A-Za-z0-9]*\b/, desc: 'catch 后返回 mock 常量' },
  { id: 'mock-fallback-copy', re: /已降级为本地模拟数据/, desc: '降级为本地模拟数据文案' },
  { id: 'mock-adapter', re: /\bmockApiAdapter\b/, desc: 'mock CRUD 适配器' },
  { id: 'mock-banner', re: /\bmock_banner\b/, desc: 'mock 演示态横幅' },
  { id: 'mock-state', re: /\bisMockData\b/, desc: 'mock 演示态开关' },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const violations = new Map(); // key: relativePath::patternId  -> [{line, text}]

for (const file of walk(scanRoot)) {
  const rel = path.relative(repoRoot, file).split(path.sep).join('/');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    // 行内注释里的说明不算违规（例如指向 TODO / 解释为何删除）
    if (/^\s*(\/\/|\*)/.test(line)) return;
    // stories 不参与生产构建
    if (rel.endsWith('.stories.tsx')) return;
    for (const p of PATTERNS) {
      if (p.re.test(line)) {
        const key = `${rel}::${p.id}`;
        if (!violations.has(key)) violations.set(key, []);
        violations.get(key).push({ line: idx + 1, text: line.trim().slice(0, 120) });
      }
    }
  });
}

const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  : { generated: null, entries: {} };
const known = new Set(Object.keys(baseline.entries ?? {}));

const fresh = [...violations.keys()].filter((k) => !known.has(k)).sort();
const stale = [...known].filter((k) => !violations.has(k)).sort();

if (updateBaseline) {
  if (fresh.length && fs.existsSync(baselinePath)) {
    console.error(`[mock-gate] 拒绝写入基线：发现 ${fresh.length} 条新违规，必须先修代码`);
    for (const k of fresh) console.error(`  + ${k}`);
    process.exit(1);
  }
  const entries = {};
  for (const k of [...violations.keys()].sort()) {
    entries[k] = { count: violations.get(k).length };
  }
  fs.writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        generated: new Date().toISOString().slice(0, 10),
        scope: 'apps/web/src（非测试）',
        note: '存量 mock 兜底债务清单：只减不增，修一处核销一处',
        entries,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`[mock-gate] 基线已更新：${Object.keys(entries).length} 条（核销 ${stale.length} 条）`);
  process.exit(0);
}

let failed = false;
if (fresh.length) {
  failed = true;
  console.error(`[mock-gate] 新增 mock 兜底 ${fresh.length} 处（生产路径禁止回退假数据）：`);
  for (const k of fresh) {
    for (const v of violations.get(k)) console.error(`  ${k}:${v.line}  ${v.text}`);
  }
}
if (stale.length) {
  failed = true;
  console.error(`[mock-gate] 基线有 ${stale.length} 条已消失（请 --update-baseline 核销）：`);
  for (const k of stale) console.error(`  - ${k}`);
}
if (failed) process.exit(1);

console.log(
  `[mock-gate] OK  扫描 ${walk(scanRoot).length} 文件，违规 ${violations.size} 处，全部在基线内（基线 ${known.size} 条）`
);
