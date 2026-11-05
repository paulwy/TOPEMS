#!/usr/bin/env node
/**
 * scripts/ci/check-directed-migrations.mjs
 *
 * 定向迁移命名校验（prod 误跑防线之一）。
 *
 * 规则：禁止新增 test/5433 定向命名的迁移文件。命中任一即阻断：
 *   - *_dbNN_test_*       （db07_test / db08_test …）
 *   - *_dbNN_5433_*       （db10_5433 / db11_5433 …）
 *   - *_test_*            （test_baseline …）
 *   - *_5433_*            （5433_audit_gap_fill / rehome_5433_* …）
 *   与 scripts/migration/apply-forward.sh 的 DENY_RE 保持同一口径。
 *
 * 既存 19 个定向文件全部白名单豁免（保证 main 立即为绿）：
 *   - 8 个：prod 账本缺失的定向迁移（db07/db08/db10/db11/db14/db15/db16/db18）
 *   - 11 个：其余历史定向文件（db09/db12/db13/db17/db20/db21/db23/db24、
 *     test_baseline_20、5433_audit_gap_fill、rehome_5433_remaining）
 * 白名单只豁免「已存在文件」，新增文件不受影响。
 *
 * 用法：
 *   node scripts/ci/check-directed-migrations.mjs                # 全量（CI）
 *   node scripts/ci/check-directed-migrations.mjs --changed-only # 仅暂存新增/修改（pre-commit）
 *   node scripts/ci/check-directed-migrations.mjs --json
 */

import { readdirSync, statSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const DENY_RE = /(?:^|_)(?:db\d+_(?:test|5433)|5433_|test_)/i;

// --- 既存定向迁移白名单（19 条，来源见头注释） --------------------------------
const WHITELIST = new Set([
  // 8 条 prod 账本缺失的定向迁移（apply-forward --prod 硬拒绝对象）
  '20261103200000_db07_test_timestamp_uuid_align_prod.sql',
  '20261103210000_db08_test_varchar_to_text_190cols.sql',
  '20261103230000_db10_5433_varchar_text_to_uuid_19cols.sql',
  '20261104000000_db11_5433_varchar_to_text_24cols.sql',
  '20261104030000_db14_test_varchar_to_uuid_7cols_with_data.sql',
  '20261104040000_db15_5433_integer_bigint_16cols.sql',
  '20261104050000_db16_5433_tenant_id_rls_decouple_14cols.sql',
  '20261104070000_db18_5433_special_types_8cols.sql',
  // 11 条其余历史定向文件（已入 prod 账本或仅用于 test/5433，历史豁免）
  '20260903000001_rehome_5433_remaining_public.sql',
  '20260918000034_5433_audit_gap_fill.sql',
  '20261103220000_db09_test_iam_position_id_bigint_to_uuid.sql',
  '20261104010000_db12_5433_date_timestamptz_21cols.sql',
  '20261104020000_db13_5433_numeric_double_20cols.sql',
  '20261104060000_db17_5433_misc_12cols.sql',
  '20261105110000_db20_test_timestamptz_align_prod_169cols.sql',
  '20261105120000_db21_test_varchar_numeric_widen_16cols.sql',
  '20261105150000_db23_test_type_align_4cols.sql',
  '20261105180000_db24_test_rfm_numeric_2cols.sql',
  '20261105235000_test_baseline_20_reverse_tables.sql',
]);

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');
const JSON_MODE = args.includes('--json');
const ROOTS = ['database', 'svc', 'lib'];

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && entry.name.endsWith('.sql') && basename(dir) === 'migrations') out.push(p);
  }
}

function changedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8', cwd: ROOT, stdio: ['pipe', 'pipe', 'ignore'] });
    const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf-8', cwd: ROOT, stdio: ['pipe', 'pipe', 'ignore'] });
    return [...staged.split('\n'), ...untracked.split('\n')]
      .map((s) => s.trim())
      .filter((s) => s.endsWith('.sql') && /(^|\/)migrations\//.test(s));
  } catch {
    return [];
  }
}

let files = [];
if (CHANGED_ONLY) {
  const changed = changedFiles();
  for (const rel of changed) {
    const p = join(ROOT, rel);
    if (statSync(p, { throwIfNoEntry: false })) files.push(p);
  }
} else {
  for (const r of ROOTS) {
    try {
      if (statSync(join(ROOT, r)) ) walk(join(ROOT, r), files);
    } catch {
      /* root 缺失忽略 */
    }
  }
}

const violations = [];
const whitelisted = [];
for (const p of files) {
  const name = basename(p);
  if (!DENY_RE.test(name)) continue;
  const rel = relative(ROOT, p);
  if (WHITELIST.has(name)) whitelisted.push(rel);
  else {
    violations.push({
      file: rel,
      reason: '定向迁移命名（dbNN_test / dbNN_5433 / test_* / 5433_*）',
      fixes: [
        '改名：去掉 test/5433 环境特征，用正式主题前缀（如 YYYYMMDDHHMMSS_{topic}_{summary}.sql）',
        '改为前向迁移：如确需在 prod/test 双库生效，写成带守卫的通用迁移（to_regclass / IF EXISTS），放入正式链',
        '申请白名单：仅限确属 test/5433 专用且不可替代，需在 scripts/ci/check-directed-migrations.mjs 注明来源与理由',
      ],
    });
  }
}

// 白名单陈旧检查（全量模式）
const found = new Set(files.map((p) => basename(p)));
const staleWhitelist = CHANGED_ONLY ? [] : [...WHITELIST].filter((n) => !found.has(n));
const pass = violations.length === 0;

if (JSON_MODE) {
  console.log(JSON.stringify({ pass, mode: CHANGED_ONLY ? 'changed-only' : 'full', scanned: files.length, whitelisted: whitelisted.length, staleWhitelist, violations }, null, 2));
} else {
  console.log(`\
Directed migration naming gate (${CHANGED_ONLY ? 'changed-only' : 'full'})
---------------------------
扫描 .sql 文件      : ${files.length}
命中定向命名        : ${whitelisted.length + violations.length}（白名单 ${whitelisted.length} / 违规 ${violations.length}）
白名单陈旧条目      : ${staleWhitelist.length}
`);
  if (violations.length > 0) {
    console.log('违规清单:');
    for (const v of violations) {
      console.log(`  ❌ ${v.file} — ${v.reason}`);
      for (const f of v.fixes) console.log(`      → ${f}`);
    }
  }
  if (staleWhitelist.length > 0) {
    console.log(`⚠️  白名单中的文件已不存在（建议清理）: ${staleWhitelist.join(', ')}`);
  }
  console.log(pass ? 'PASS.' : `FAIL: ${violations.length} 个新增定向迁移命名违规。`);
}

process.exit(pass ? 0 : 1);
