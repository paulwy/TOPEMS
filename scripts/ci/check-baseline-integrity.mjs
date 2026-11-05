#!/usr/bin/env node
/**
 * scripts/ci/check-baseline-integrity.mjs
 *
 * 基线完整性校验（「基线即唯一供给入口」防腐化门禁）。
 *
 * 校验项：
 *   1) 基线资产存在，且 schema/ledger 的 sha256 与基线元数据一致；
 *   2) 锚点是 14 位版本号且可解析为合法时间戳（YYYYMMDDHHMMSS）；
 *   3) anchors.json 单调不减，且最新锚点 = 最新 baseline_*.json 锚点；
 *   4) 新增迁移（不在 migrations_at_anchor.json 清单内）版本号必须 > 锚点；
 *      清单内为既存迁移（含 19 条定向 + 16 条跳过项），豁免。
 *
 * 用法：
 *   node scripts/ci/check-baseline-integrity.mjs                 # 全量（CI）
 *   node scripts/ci/check-baseline-integrity.mjs --changed-only  # 仅暂存新增/修改（pre-commit）
 *   node scripts/ci/check-baseline-integrity.mjs --json
 *   node scripts/ci/check-baseline-integrity.mjs --write-manifest # 锚点前移时重生成清单（人工步骤）
 *
 * 退出码：0 通过；1 违规。
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const BASELINE_DIR = join(ROOT, 'database/baseline');
const MIG_DIR = join(ROOT, 'database/migrations');
const ANCHORS_FILE = join(BASELINE_DIR, 'anchors.json');

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');
const JSON_MODE = args.includes('--json');
const WRITE_MANIFEST = args.includes('--write-manifest');

const violations = [];
const warnings = [];

function rel(p) {
  return p.replace(`${ROOT}/`, '');
}

function readJson(p, label) {
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch (e) {
    violations.push(`${label} 读取/解析失败：${rel(p)}（${e.message}）`);
    return null;
  }
}

function sha256(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex');
}

function isLegalAnchor(v) {
  if (!/^\d{14}$/.test(String(v))) return false;
  const s = String(v);
  const y = Number(s.slice(0, 4));
  const mo = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  const h = Number(s.slice(8, 10));
  const mi = Number(s.slice(10, 12));
  const se = Number(s.slice(12, 14));
  if (y < 2000 || y > 2100) return false;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  if (h > 23 || mi > 59 || se > 59) return false;
  return true;
}

function migrationFiles() {
  const tracked = execSync('git ls-files database/migrations', { cwd: ROOT, encoding: 'utf-8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  let extra = [];
  try {
    extra = execSync('git ls-files --others --exclude-standard database/migrations', { cwd: ROOT, encoding: 'utf-8' })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { /* ignore */ }
  return [...new Set([...tracked, ...extra])].filter((p) => p.endsWith('.sql'));
}

function changedMigrationFiles() {
  const out = new Set();
  for (const cmd of [
    'git diff --cached --name-only --diff-filter=ACMR',
    'git ls-files --others --exclude-standard',
  ]) {
    try {
      const lines = execSync(`${cmd} database/migrations`, { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
        .split('\n').map((s) => s.trim()).filter(Boolean);
      for (const l of lines) if (l.endsWith('.sql')) out.add(l);
    } catch { /* ignore */ }
  }
  return [...out];
}

// ── 1) anchors.json 与单调性 ───────────────────────────────────────────────
const anchorsDoc = existsSync(ANCHORS_FILE) ? readJson(ANCHORS_FILE, 'anchors.json') : null;
if (!existsSync(ANCHORS_FILE)) {
  violations.push('anchors.json 不存在：database/baseline/anchors.json（基线必须登记历史锚点）');
}
const anchors = anchorsDoc && Array.isArray(anchorsDoc.anchors) ? anchorsDoc.anchors : [];

let prev = 0;
for (const [i, a] of anchors.entries()) {
  if (!isLegalAnchor(a.anchor_version)) {
    violations.push(`anchors[${i}] 锚点非法（需 14 位合法时间戳）：${a.anchor_version}`);
    continue;
  }
  const cur = Number(a.anchor_version);
  if (cur < prev) violations.push(`anchors[${i}] 锚点回退：${a.anchor_version} < 上一锚点 ${prev}`);
  prev = cur;
}

// ── 2) 最新锚点 = 最新 baseline 元数据 ─────────────────────────────────────
const metaFiles = existsSync(BASELINE_DIR)
  ? readdirSync(BASELINE_DIR).filter((f) => /^baseline_\d{14}\.json$/.test(f))
  : [];
let latestMeta = null;
for (const f of metaFiles) {
  const m = readJson(join(BASELINE_DIR, f), `基线元数据 ${f}`);
  if (m && (!latestMeta || Number(m.anchor_version) > Number(latestMeta.anchor_version))) latestMeta = m;
}

const latestAnchorEntry = anchors.length ? anchors[anchors.length - 1] : null;
if (latestMeta) {
  if (!isLegalAnchor(latestMeta.anchor_version)) {
    violations.push(`基线元数据锚点非法：${latestMeta.anchor_version}`);
  }
  if (latestAnchorEntry && Number(latestAnchorEntry.anchor_version) !== Number(latestMeta.anchor_version)) {
    violations.push(
      `anchors.json 最新锚点 ${latestAnchorEntry.anchor_version} 与最新基线元数据 ${latestMeta.anchor_version} 不一致（基线更新后必须登记 anchors）`,
    );
  }

  // ── 3) 资产存在 + sha256 一致 ───────────────────────────────────────────
  for (const key of ['schema', 'ledger']) {
    const file = latestMeta[`${key}_file`];
    const expected = latestMeta[`${key}_sha256`];
    if (typeof file !== 'string' || !file) {
      violations.push(`基线元数据缺少 ${key}_file`);
      continue;
    }
    const p = join(BASELINE_DIR, file);
    if (!existsSync(p)) {
      violations.push(`基线资产缺失：database/baseline/${file}`);
      continue;
    }
    if (!expected || !/^[a-f0-9]{64}$/i.test(expected)) {
      violations.push(`基线元数据 ${key}_sha256 缺失/格式非法`);
      continue;
    }
    const actual = sha256(p);
    if (actual !== expected.toLowerCase()) {
      violations.push(`基线资产 sha256 不匹配：${file}（实际 ${actual} ≠ 元数据 ${expected}）`);
    }
  }
  if (latestAnchorEntry) {
    for (const key of ['schema', 'ledger']) {
      const f = `${key}_file`;
      const s = `${key}_sha256`;
      if (latestAnchorEntry[f] && latestAnchorEntry[f] !== latestMeta[f]) {
        violations.push(`anchors.json 最新条目的 ${f} 与基线元数据不一致`);
      }
      if (latestAnchorEntry[s] && latestAnchorEntry[s] !== latestMeta[s]) {
        violations.push(`anchors.json 最新条目的 ${s} 与基线元数据不一致`);
      }
    }
  }
}

// ── 4) 新增迁移版本号必须 > 锚点 ────────────────────────────────────────────
const anchorNum = latestMeta ? Number(latestMeta.anchor_version) : (latestAnchorEntry ? Number(latestAnchorEntry.anchor_version) : 0);
const manifestRel = latestAnchorEntry?.migrations_manifest || (latestMeta ? `migrations_at_anchor.json` : '');
const manifestPath = manifestRel ? join(BASELINE_DIR, manifestRel) : '';
const manifest = manifestPath && existsSync(manifestPath) ? readJson(manifestPath, 'migrations_at_anchor.json') : null;
let manifestSet = new Set();
if (manifest && Array.isArray(manifest.files)) manifestSet = new Set(manifest.files);
else if (existsSync(MIG_DIR)) warnings.push('迁移清单缺失或非法：新增迁移检查将无豁免依据');

if (WRITE_MANIFEST) {
  const files = migrationFiles().map((p) => basename(p)).sort();
  const out = {
    anchor_version: anchorNum,
    generated_at_utc: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    files,
  };
  writeFileSync(manifestPath || join(BASELINE_DIR, 'migrations_at_anchor.json'), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`[baseline] 已重生成迁移清单：${rel(manifestPath || 'database/baseline/migrations_at_anchor.json')}（${files.length} 条，锚点 ${anchorNum}）`);
  process.exit(0);
}

const candidates = CHANGED_ONLY ? changedMigrationFiles() : migrationFiles();
const newOnes = [];
for (const p of candidates) {
  const b = basename(p);
  if (manifestSet.has(b)) continue; // 既存迁移（含定向/跳过白名单）豁免
  if (!/^[0-9]{14}_/.test(b)) {
    violations.push(`新增迁移命名非法（需 14 位版本前缀）：${b}`);
    continue;
  }
  const v = Number(b.slice(0, 14));
  if (!(v > anchorNum)) {
    violations.push(`新增迁移版本必须 > 锚点：${b}（version=${v} ≤ anchor=${anchorNum}）`);
  } else {
    newOnes.push(b);
  }
}

// ── 输出 ───────────────────────────────────────────────────────────────────
const result = {
  mode: CHANGED_ONLY ? 'changed-only' : 'full',
  anchor: anchorNum,
  baseline_meta: latestMeta ? latestMeta.anchor_version : null,
  anchors_count: anchors.length,
  manifest_files: manifestSet.size,
  checked_migrations: candidates.length,
  new_migrations_ok: newOnes.length,
  warnings,
  violations,
  ok: violations.length === 0,
};

if (JSON_MODE) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[baseline-integrity] mode=${result.mode} anchor=${anchorNum} meta=${result.baseline_meta} anchors=${result.anchors_count} manifest=${manifestSet.size} checked=${candidates.length}`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (violations.length) {
    for (const v of violations) console.log(`  ✗ ${v}`);
    console.log(`[baseline-integrity] FAIL（${violations.length} 项）`);
  } else {
    console.log(`[baseline-integrity] PASS（新增迁移 ${newOnes.length} 条均 > 锚点）`);
  }
}
process.exit(violations.length === 0 ? 0 : 1);
