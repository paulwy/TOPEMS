#!/usr/bin/env node
'use strict';

/* ==========================================================================
 * SQLx Offline Cache Freshness Checker — D-Track Gate
 * Single CJS file · STATIC checks only (never runs `cargo sqlx prepare`).
 * Dry-run DEFAULT: never exit≠1 unless explicit --fail-fast
 *
 * Background:
 *   V272 deleted migration.rs but left `pub mod migration` in lib.rs, and the
 *   .sqlx offline cache was stale → `SQLX_OFFLINE=true cargo check` reported
 *   18 errors. This gate performs lightweight static checks so a stale /
 *   untracked / missing cache surfaces in CI before the offline build breaks.
 *
 * Checks:
 *   C1  .sqlx/ cache directory exists              → missing = FAIL
 *   C2  .sqlx/*.json file count                    → < --min-files (50) = WARN
 *   C3  git dirty on .sqlx/*.json (uncommitted)     → dirty = WARN (stale=true)
 *   C4  .sqlx/*.json tracked by git                → 0 tracked = WARN (gitignored)
 *
 * Summary block:
 *   SQLX_CACHE_STATUS: PASS/WARN/FAIL · files: N · stale: true/false
 *
 * Exit logic (project_memory CI Gate rule):
 *   - DRY-RUN (default)        → always exit=0
 *   - --fail-fast + status=FAIL → exit=1
 * ========================================================================== */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOPEMS_ROOT = path.resolve(__dirname, '..', '..');
const ARGS = process.argv.slice(2);

/* ---------- CLI Args (P4 pattern · supports --x=v OR --x v) ---------- */
const argIdx = (name) => {
  const idx = ARGS.indexOf(name);
  if (idx !== -1) return { i: idx, mode: 'space' };
  const eqIdx = ARGS.findIndex(a => typeof a === 'string' && a.startsWith(`${name}=`));
  return eqIdx === -1 ? { i: -1, mode: null } : { i: eqIdx, mode: 'eq' };
};
const HAS_ARG = (name) => argIdx(name).i !== -1;
const GET_ARG = (name, fallback = null) => {
  const { i, mode } = argIdx(name);
  if (i === -1) return fallback;
  if (mode === 'eq') return ARGS[i].slice(name.length + 1) || fallback;
  return ARGS[i + 1] || fallback;
};

// --dry-run is accepted as a no-op (dry-run is the default); only --fail-fast flips behavior.
const DRY_RUN = !HAS_ARG('--fail-fast');
const REPORT_JSON = GET_ARG('--report-json');
const SQLX_DIR = GET_ARG('--sqlx-dir', '.sqlx');
const MIN_FILES = Number(GET_ARG('--min-files', '50'));

const SQLX_ABS = path.isAbsolute(SQLX_DIR) ? SQLX_DIR : path.join(TOPEMS_ROOT, SQLX_DIR);

const REPORT = {
  version: 'sqlx-cache-freshness-gate@1.0.0',
  createdAt: new Date().toISOString(),
  runConfig: { dryRun: DRY_RUN, sqlxDir: SQLX_DIR, minFiles: MIN_FILES },
  checks: {
    c1_dirExists: null,
    c2_fileCount: null,
    c3_gitDirty: null,
    c4_tracked: null
  },
  metrics: {
    fileCount: 0,
    trackedCount: 0,
    dirtyFiles: [],
    ignoredSample: null
  },
  status: 'FAIL',
  stale: false,
  failures: [],
  warnings: []
};

/* ---------- Helpers ---------- */
function git(args) {
  // Returns trimmed stdout on success (exit 0), null on any failure (incl. exit 1).
  // Used so `git check-ignore` (exit 1 = not ignored) degrades gracefully.
  try {
    return execSync(`git ${args}`, {
      cwd: TOPEMS_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (e) {
    return null;
  }
}

function listJsonFiles(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.json'))
    .map(e => path.join(dir, e.name));
}

/* ---------- Checks ---------- */
function runChecks() {
  // C1: cache directory exists
  let dirExists = false;
  try { dirExists = fs.statSync(SQLX_ABS).isDirectory(); } catch { dirExists = false; }
  REPORT.checks.c1_dirExists = dirExists;
  if (!dirExists) {
    REPORT.failures.push({
      check: 'C1', level: 'FAIL',
      msg: `.sqlx/ cache directory not found at '${SQLX_DIR}'. ` +
           `Run \`cargo sqlx prepare\` locally and commit the resulting .sqlx/query-*.json files. ` +
           `Without the offline cache, SQLX_OFFLINE=true cargo check fails in CI (no DB available).`
    });
    REPORT.status = 'FAIL';
    return;
  }

  // C2: file count (incomplete cache heuristic)
  const jsonFiles = listJsonFiles(SQLX_ABS);
  REPORT.metrics.fileCount = jsonFiles.length;
  REPORT.checks.c2_fileCount = jsonFiles.length;
  if (jsonFiles.length < MIN_FILES) {
    REPORT.warnings.push({
      check: 'C2', level: 'WARN',
      msg: `Only ${jsonFiles.length} .sqlx/*.json files found (< ${MIN_FILES}). ` +
           `Cache may be incomplete — re-run \`cargo sqlx prepare\` to regenerate the full set.`
    });
    if (REPORT.status !== 'FAIL') REPORT.status = 'WARN';
  }

  // C3: git dirty on .sqlx/*.json (uncommitted / untracked → stale)
  //     staged + unstaged + untracked (non-ignored). Any present = stale.
  const dirtySet = new Set();
  const staged = git(`diff --cached --name-only --diff-filter=ACMR -- '${SQLX_DIR}'`);
  if (staged) staged.split('\n').filter(Boolean).forEach(f => dirtySet.add(f));
  const unstaged = git(`diff --name-only --diff-filter=ACMR -- '${SQLX_DIR}'`);
  if (unstaged) unstaged.split('\n').filter(Boolean).forEach(f => dirtySet.add(f));
  const untracked = git(`ls-files --others --exclude-standard -- '${SQLX_DIR}'`);
  if (untracked) untracked.split('\n').filter(Boolean).forEach(f => dirtySet.add(f));
  const dirtyFiles = Array.from(dirtySet).sort();
  REPORT.metrics.dirtyFiles = dirtyFiles;
  REPORT.checks.c3_gitDirty = dirtyFiles.length > 0;
  if (dirtyFiles.length > 0) {
    REPORT.stale = true;
    REPORT.warnings.push({
      check: 'C3', level: 'WARN',
      msg: `${dirtyFiles.length} .sqlx/ cache file(s) have uncommitted changes (stale). ` +
           `Commit them alongside the SQL/migration changes so CI offline build stays in sync. ` +
           `Sample: ${dirtyFiles.slice(0, 3).join(', ')}${dirtyFiles.length > 3 ? ' …' : ''}`
    });
    if (REPORT.status !== 'FAIL') REPORT.status = 'WARN';
  }

  // C4: tracked by git (cache under version control)
  const tracked = git(`ls-files -- '${SQLX_DIR}'`);
  const trackedFiles = tracked ? tracked.split('\n').filter(f => f.endsWith('.json')) : [];
  REPORT.metrics.trackedCount = trackedFiles.length;
  REPORT.checks.c4_tracked = trackedFiles.length > 0;
  if (trackedFiles.length === 0) {
    REPORT.warnings.push({
      check: 'C4', level: 'WARN',
      msg: `No .sqlx/*.json files are tracked by git. ` +
           `The cache appears gitignored — CI (which has no DB) cannot verify SQL offline. ` +
           `Whitelist the cache JSON in .gitignore (e.g. \`!.sqlx/query-*.json\`).`
    });
    if (REPORT.status !== 'FAIL') REPORT.status = 'WARN';
  } else {
    // Spot-check: a tracked file should not also be matched by an ignore rule.
    const sample = trackedFiles[0];
    const ignored = git(`check-ignore '${sample}'`);
    if (ignored) {
      REPORT.metrics.ignoredSample = sample;
      REPORT.warnings.push({
        check: 'C4', level: 'WARN',
        msg: `Tracked file '${sample}' is also matched by a gitignore rule — verify the whitelist.`
      });
      if (REPORT.status !== 'FAIL') REPORT.status = 'WARN';
    }
  }

  // Final: no failures AND no warnings → PASS
  if (REPORT.failures.length === 0 && REPORT.warnings.length === 0) {
    REPORT.status = 'PASS';
  }
}

/* ---------- Run ---------- */
function runGate() {
  runChecks();

  if (REPORT_JSON) {
    const outPath = path.resolve(TOPEMS_ROOT, REPORT_JSON);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(REPORT, null, 2), 'utf8');
  }
  return REPORT;
}

/* ---------- CLI Exit Handler ---------- */
if (require.main === module) {
  (async () => {
    const report = runGate();
    const banner = report.status === 'PASS' ? '✅ PASS'
      : report.status === 'WARN' ? '⚠️  WARN'
      : '❌ FAIL';
    console.log('\n' + '='.repeat(72));
    console.log('  SQLX OFFLINE CACHE FRESHNESS CHECKER · D-TRACK  ' + banner);
    console.log('='.repeat(72));
    console.log('  Cache dir       :', SQLX_DIR);
    console.log('  Mode            :', DRY_RUN ? 'DRY-RUN (default, never exit≠1)' : 'FAIL-FAST');
    console.log('  ── Checks ──');
    console.log(`   C1 dir exists        : ${REPORT.checks.c1_dirExists}`);
    console.log(`   C2 file count        : ${REPORT.metrics.fileCount}  (min ${MIN_FILES})`);
    console.log(`   C3 git dirty (stale) : ${REPORT.checks.c3_gitDirty}  (files: ${REPORT.metrics.dirtyFiles.length})`);
    console.log(`   C4 git-tracked       : ${REPORT.checks.c4_tracked}  (tracked: ${REPORT.metrics.trackedCount})`);
    if (REPORT.failures.length) {
      console.log(`\n  ⛔ FAILURES:`);
      REPORT.failures.forEach(f => console.log(`    [${f.check}] ${f.msg}`));
    }
    if (REPORT.warnings.length) {
      console.log(`\n  ⚠️  WARNINGS:`);
      REPORT.warnings.forEach(w => console.log(`    [${w.check}] ${w.msg}`));
    }
    console.log('\n  ' + '='.repeat(70));
    console.log(`  SQLX_CACHE_STATUS: ${report.status} · files: ${REPORT.metrics.fileCount} · stale: ${report.stale}`);
    console.log('  ' + '='.repeat(70));
    console.log('\n  Report JSON       :', REPORT_JSON || '(not written · pass --report-json)');
    console.log('='.repeat(72));

    /* Exit logic (project_memory CI Gate rule):
     * - DRY-RUN (default): always exit=0
     * - --fail-fast: exit=1 ONLY when status === 'FAIL' (WARN stays exit=0)
     */
    if (!DRY_RUN && report.status === 'FAIL') {
      process.exit(1);
    }
    process.exit(0);
  })().catch(err => { console.error('FATAL:', err); process.exit(3); });
}

module.exports = { runGate };
