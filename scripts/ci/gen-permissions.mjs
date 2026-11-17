#!/usr/bin/env node
/**
 * 生成 / 校验 `apps/web/src/config/permissions.ts` 里的 CORE_PERMISSION_CODES 块。
 *
 * 唯一源：database/migrations/*.sql 中对 `core_permissions` 的变更语句，按文件名（迁移顺序）模拟：
 *   INSERT INTO ... core_permissions ...;                          → 加入码
 *   DELETE FROM ... core_permissions ...;                          → 移除码
 *   UPDATE ... core_permissions SET code='新' WHERE code='旧';     → 改名
 *
 * 资源串剔除：tuple 形式里 resource 列常与码同形（如 resource 'admin:iam:tenant' 与码
 * 'admin:iam:tenant:write' 同现），凡"是另一个码的前缀"的值一律按 resource 处理。
 *
 * 刻意不读数据库：生产库只读约束下，CI 也不能依赖 DB。
 *
 * 用法：
 *   node scripts/ci/gen-permissions.mjs            # DRY-RUN：只打印差异与条数
 *   node scripts/ci/gen-permissions.mjs --apply    # 写回 permissions.ts
 *   node scripts/ci/gen-permissions.mjs --check    # 校验；有漂移则退出 1（CI / lefthook 用）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const MIGRATIONS_DIR = path.join(ROOT, 'database', 'migrations');
const TARGET_FILE = path.join(ROOT, 'apps', 'web', 'src', 'config', 'permissions.ts');

const BEGIN_MARK = '// <generated:core-permission-codes';
const END_MARK = '// </generated:core-permission-codes>';

// 权限码形态：小写字母开头，2~4 段，段内允许数字/下划线/连字符
const CODE_SHAPE = /^[a-z][a-z0-9_-]*(?::[a-z0-9_-]+){1,3}$/;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CHECK = args.includes('--check');

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, '');
}

function quotedCodes(text) {
  const out = new Set();
  for (const m of text.matchAll(/'([^']{3,90})'/g)) {
    const v = m[1];
    if (CODE_SHAPE.test(v)) out.add(v);
  }
  return out;
}

function collectFromMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const codes = new Set();
  let insStmts = 0;
  let delStmts = 0;
  let updStmts = 0;
  let touchedFiles = 0;

  for (const f of files) {
    const raw = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    if (!/core_permissions/.test(raw)) continue;
    const sql = stripComments(raw);
    let touched = false;

    for (const stmt of sql.match(/INSERT\s+INTO\s+(?:public\.|iam\.)?core_permissions\b[\s\S]*?;/gi) || []) {
      insStmts++;
      touched = true;
      for (const c of quotedCodes(stmt)) codes.add(c);
    }
    for (const stmt of sql.match(/DELETE\s+FROM\s+(?:public\.|iam\.)?core_permissions\b[\s\S]*?;/gi) || []) {
      delStmts++;
      touched = true;
      for (const c of quotedCodes(stmt)) codes.delete(c);
    }
    for (const stmt of sql.match(/UPDATE\s+(?:public\.|iam\.)?core_permissions\b[\s\S]*?;/gi) || []) {
      updStmts++;
      touched = true;
      const next = stmt.match(/SET\s+code\s*=\s*'([^']+)'/i);
      const prev = stmt.match(/WHERE\s+code\s*=\s*'([^']+)'/i);
      if (next && prev) {
        codes.delete(prev[1]);
        codes.add(next[1]);
      }
    }
    if (touched) touchedFiles++;
  }

  // 去掉与码同形的 resource 列取值：凡为另一个码前缀者剔除
  const parents = new Set();
  for (const c of codes) {
    const i = c.lastIndexOf(':');
    if (i > 0) parents.add(c.slice(0, i));
  }
  for (const c of codes) {
    if (parents.has(c)) codes.delete(c);
  }

  return { codes: [...codes].sort(), stats: { touchedFiles, insStmts, delStmts, updStmts } };
}

function renderBlock(codes) {
  const lines = [
    `${BEGIN_MARK} source="database/migrations/*.sql" tool="scripts/ci/gen-permissions.mjs">`,
    '// 本块由脚本生成，请勿手改；增量改数据库种子后重新生成。',
    '// 生成：node scripts/ci/gen-permissions.mjs --apply',
    '// 校验：node scripts/ci/gen-permissions.mjs --check',
    'export const CORE_PERMISSION_CODES: string[] = [',
    ...codes.map((c) => `  '${c}',`),
    '];',
    END_MARK,
  ];
  return lines.join('\n');
}

function readTarget() {
  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`[ERROR] 目标文件不存在：${TARGET_FILE}`);
    process.exit(2);
  }
  return fs.readFileSync(TARGET_FILE, 'utf8');
}

function extractCurrentCodes(text) {
  const begin = text.indexOf(BEGIN_MARK);
  const end = text.indexOf(END_MARK);
  if (begin < 0 || end < 0 || end < begin) return null;
  const block = text.slice(begin, end);
  const arr = block.match(/=\s*\[([\s\S]*?)\];/);
  if (!arr) return null;
  return [...quotedCodes(arr[1])].sort();
}

function spliceBlock(text, block) {
  const begin = text.indexOf(BEGIN_MARK);
  const end = text.indexOf(END_MARK);
  if (begin >= 0 && end > begin) {
    return text.slice(0, begin) + block + text.slice(end + END_MARK.length);
  }
  // 首次插入：放在 ALL_3PART_PERM_CODES 注释之前，保持派生逻辑紧跟其后
  const anchor = '// Convenience flattened list of all 3-part permission code strings';
  const ai = text.indexOf(anchor);
  if (ai < 0) {
    console.error(`[ERROR] 无法定位插入锚点（${anchor}），请手动放置生成块标记后重试`);
    process.exit(2);
  }
  return `${text.slice(0, ai)}${block}\n\n${text.slice(ai)}`;
}

const { codes, stats } = collectFromMigrations();
const next = renderBlock(codes);
const current = readTarget();
const prevCodes = extractCurrentCodes(current);

console.error(
  `[gen-permissions] 迁移文件 ${stats.touchedFiles} 个 / INSERT ${stats.insStmts} / DELETE ${stats.delStmts} / UPDATE ${stats.updStmts}`
);
console.error(`[gen-permissions] 有效权限码 ${codes.length} 条（迁移顺序模拟后）`);

if (CHECK) {
  if (!prevCodes) {
    console.error('[gen-permissions] FAIL 目标文件中没有生成块标记，无法校验');
    process.exit(1);
  }
  const a = new Set(prevCodes);
  const b = new Set(codes);
  const missingInFile = codes.filter((c) => !a.has(c));
  const staleInFile = prevCodes.filter((c) => !b.has(c));
  if (missingInFile.length || staleInFile.length || prevCodes.length !== codes.length) {
    console.error(
      `[gen-permissions] FAIL 漂移：文件少 ${missingInFile.length} 条、多 ${staleInFile.length} 条（文件 ${prevCodes.length} / 源 ${codes.length}）`
    );
    if (missingInFile.length)
      console.error(
        `  缺少（源有）: ${missingInFile.slice(0, 10).join(', ')}${missingInFile.length > 10 ? ' ...' : ''}`
      );
    if (staleInFile.length)
      console.error(`  多余（源无）: ${staleInFile.slice(0, 10).join(', ')}${staleInFile.length > 10 ? ' ...' : ''}`);
    console.error('  修复：node scripts/ci/gen-permissions.mjs --apply');
    process.exit(1);
  }
  console.log(`[gen-permissions] OK 与 permissions.ts 一致（${codes.length} 条）`);
  process.exit(0);
}

const updated = spliceBlock(current, next);
if (updated === current) {
  console.log(`[gen-permissions] 无变化（${codes.length} 条）`);
  process.exit(0);
}

if (!APPLY) {
  console.error('[gen-permissions] DRY-RUN：未写磁盘（加 --apply 写入）');
  process.exit(0);
}

fs.writeFileSync(TARGET_FILE, updated, 'utf8');
console.log(`[gen-permissions] 已写入 ${path.relative(ROOT, TARGET_FILE)}（${codes.length} 条）`);
