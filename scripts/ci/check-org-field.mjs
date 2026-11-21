#!/usr/bin/env node
/**
 * scripts/ci/check-org-field.mjs
 *
 * 组织字段口径门禁（TODO W5-C / E4-15）。
 *
 * 口径（V69.1 定案）：`tenant_id` 是租户隔离键，`org_id` 是组织层级键，
 * `company_id` 只保留法人主体语义；`organization_id` 已废弃，不得在新迁移中
 * 继续出现。存量按 `scripts/ci/org-field-baseline.json` 冻结，只减不增。
 *
 * 度量：`database/migrations/**\/*.sql` 中 `organization_id` 标识符出现次数，
 * 按文件冻结。默认全量比较；`--changed-only` 只检查暂存区里的 SQL 迁移。
 * 新文件出现 `organization_id` 直接阻断；既有文件次数上升阻断；下降只提示核销。
 *
 * 用法：
 *   node scripts/ci/check-org-field.mjs
 *   node scripts/ci/check-org-field.mjs --changed-only
 *   node scripts/ci/check-org-field.mjs --json
 *   node scripts/ci/check-org-field.mjs --report-only
 *   node scripts/ci/check-org-field.mjs --update-baseline
 *
 * 退出码：0 通过（含仅有下降）；1 存在新增/上升。
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'database/migrations');
const BASELINE_FILE = join(ROOT, 'scripts/ci/org-field-baseline.json');
const FIELD_RE = /\borganization_id\b/g;

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');
const JSON_MODE = args.includes('--json');
const REPORT_ONLY = args.includes('--report-only');
const UPDATE_BASELINE = args.includes('--update-baseline');

function listSqlFiles() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => join(MIGRATIONS_DIR, name))
    .filter((path) => statSync(path).isFile());
}

function countField(src) {
  return [...src.matchAll(FIELD_RE)].length;
}

function currentCounts() {
  const counts = {};
  for (const path of listSqlFiles()) {
    const n = countField(readFileSync(path, 'utf8'));
    if (n > 0) counts[relative(ROOT, path)] = n;
  }
  return counts;
}

function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) return { total: 0, files: {} };
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
}

function stagedMigrationFiles() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('database/migrations/') && s.endsWith('.sql'));
  } catch {
    return [];
  }
}

const baseline = loadBaseline();
const baselineFiles = baseline.files || {};
const current = currentCounts();

if (UPDATE_BASELINE) {
  const sorted = Object.fromEntries(
    Object.entries(current).sort(([a], [b]) => a.localeCompare(b))
  );
  const next = { total: Object.values(sorted).reduce((a, b) => a + b, 0), files: sorted };
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`updated ${relative(ROOT, BASELINE_FILE)}: total=${next.total}, files=${Object.keys(sorted).length}`);
  process.exit(0);
}

const scope = CHANGED_ONLY ? new Set(stagedMigrationFiles()) : null;
const checked = Object.fromEntries(
  Object.entries(current).filter(([file]) => !scope || scope.has(file))
);

// --changed-only 下，未暂存的既有文件不参与；但暂存的新文件会以 0 基线出现。
const problems = [];
const reductions = [];

for (const [file, n] of Object.entries(checked)) {
  const base = baselineFiles[file] ?? 0;
  if (n > base) problems.push({ file, base, current: n, kind: base === 0 ? 'new' : 'increase' });
  else if (n < base) reductions.push({ file, base, current: n });
}

const payload = {
  mode: CHANGED_ONLY ? 'changed-only' : 'full',
  field: 'organization_id',
  baselineTotal: baseline.total ?? 0,
  currentTotal: Object.values(current).reduce((a, b) => a + b, 0),
  checkedFiles: Object.keys(checked).length,
  problems,
  reductions,
};

if (JSON_MODE) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`[org-field] mode=${payload.mode} baseline=${payload.baselineTotal} current=${payload.currentTotal}`);
  for (const p of problems) {
    const tag = p.kind === 'new' ? 'new migration' : 'increase';
    console.log(`  FAIL ${p.file}: ${tag} ${p.base} -> ${p.current}`);
  }
  for (const r of reductions) {
    console.log(`  DROP ${r.file}: ${r.base} -> ${r.current}（可 --update-baseline 核销）`);
  }
  if (!problems.length) console.log('  PASS 无新增 organization_id');
}

if (problems.length && !REPORT_ONLY) process.exit(1);
