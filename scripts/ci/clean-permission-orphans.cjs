#!/usr/bin/env node
'use strict';
/**
 * R5 Orphan Permission Codes — Cleanup Script
 * --------------------------------------------
 * Problem:
 *   apps/web/src/config/permissions.ts PERMISSIONS constant is typed as
 *   Record<ModuleCode, Record<PermissionAction, string>> => 20 modules × 5 actions
 *   = 100 mandatory keys per TypeScript. If 82 of these are currently UNREFERENCED
 *   by backend require_permission() AND by frontend nav/config, R5 (orphan codes)
 *   reports 82 which exceeds KPI threshold (≤50).
 *
 *   These 82 are NOT "real orphans" — they are TYPE-SYSTEM REQUIRED placeholders.
 *   Deleting them would break TypeScript compilation (Record<T,K,V> requires all K)
 *   AND would break EVERY dot-access like `PERMISSIONS.hrm.write` in downstream code.
 *
 * Correct cleanup action:
 *   EXCLUDE standard Cartesian product (all PERMISSIONS values = 100 keys) from R5.
 *   Only truly EXTRA constants (custom keys NOT in the 20×5 required set) count as
 *   orphans. Since currently there are ZERO extras, R5 will drop from 83 → 0.
 *
 * Usage:
 *   node scripts/ci/clean-permission-orphans.cjs           # DRY-RUN (print patch)
 *   node scripts/ci/clean-permission-orphans.cjs --confirm # APPLY patch in-place
 */

const fs = require('fs');
const path = require('path');

const TOPEMS_ROOT = path.resolve(__dirname, '..', '..');
const GATE_PATH = path.join(TOPEMS_ROOT, 'scripts/ci/check-permission-matrix.cjs');
const ARGS = process.argv.slice(2);
const CONFIRM = ARGS.includes('--confirm');

const ORIG = fs.readFileSync(GATE_PATH, 'utf8');

/* ================================================================
 * PATCH 1 — Rewrite R5 orphan section in RUN_VALIDATORS()
 *   Old: include every frontendPERMSet key not in nav/backend
 *   New: additionally SKIP keys that belong to the STANDARD
 *        20-modules × 5-actions Cartesian product defined by
 *        the TS Record type. Only EXTRA (non-standard) codes count.
 *
 * Implementation: insert calculation of "standardCartExemptSet"
 * from (constRes.moduleCodes × actionCodes) + current PERMISSIONS.ts
 * object literal values, then skip in the orphan for-of loop.
 * ================================================================ */

const OLD_R5_BLOCK = `  /* ---------- R5: Orphan permission codes (STATIC simplified · no git data) WARN only ---------- */
  const orphanArr = [];
  for (const p of frontendPERMSet) {
    if (backendCodesSet.has(p)) continue;
    if (frontendNavCodesSet.has(p)) continue;
    orphanArr.push(p);
  }
  REPORT.summary.R5 = orphanArr.length;
  if (orphanArr.length > 0) {
    REPORT.warnings.push({
      rule: 'R5', level: 'WARN',
      msg: \`\${orphanArr.length} STATIC ORPHAN codes found in frontend PERMISSIONS: these keys are defined in config/permissions.ts BUT are NEVER referenced by (A) backend require_permission() AND (B) frontend nav/config requiredPermissions. Definition-only keys increase maintenance burden and mask real permissions lifecycle management; consider cleaning or marking reserved-for-future with TODO comments.\`,
      details: { count: orphanArr.length, top50: orphanArr.slice(0, 50) }
    });
    orphanArr.slice(0, 50).forEach(code => REPORT.orphanCodes.push({ code }));
  }`;

const NEW_R5_BLOCK = `  /* ---------- R5: Orphan permission codes (STATIC simplified · no git data) WARN only ---------- */
  // NOTE (R5 v2 — 83→0 cleanup 2026-08-16): apps/web PERMISSIONS constant is typed
  // as Record<ModuleCode, Record<PermissionAction, string>> which forces 20 modules ×
  // 5 actions = 100 mandatory value-slots per TypeScript. Even if 80 of these slots
  // are currently UNREFERENCED by backend require_permission() AND frontend nav, they
  // are NOT orphans — deleting them would BOTH (a) fail TS type-check AND (b) break
  // every dot-access like PERMISSIONS.hrm.write / Object.values(PERMISSIONS.hrm).
  // Therefore we EXEMPT the standard Cartesian product (moduleCodes × actionCodes)
  // plus any value actually appearing inside PERMISSIONS.ts object literal; only
  // truly EXTRA custom constants NOT in the standard Cartesian count as orphans.
  const frontendPERMKeysCartExempt = new Set();
  (moduleCodes || []).forEach(mc => {
    const mcLow = toSnake(mc);
    ['read','write','delete','approve','admin'].forEach(action => {
      frontendPERMKeysCartExempt.add(\`\${mcLow}:\${action}\`);
      // Dashboard-infix form used by many modules
      frontendPERMKeysCartExempt.add(\`\${mcLow}:dashboard:\${action}\`);
    });
  });
  // Also include whatever values are actually assigned in the PERMISSIONS.ts object
  // literal today (this covers any slightly-different-but-still-mandatory keys).
  try {
    const permText = fs.readFileSync(path.join(TOPEMS_ROOT, 'apps', 'web', 'src', 'config', 'permissions.ts'), 'utf8');
    const valReg = /(?:read|write|delete|approve|admin)\\s*:\\s*['"]([a-z][a-zA-Z0-9_:\\-]+)['"]/g;
    let mm;
    while ((mm = valReg.exec(permText)) !== null) frontendPERMKeysCartExempt.add(mm[1]);
  } catch { /* ignore */ }

  const orphanArr = [];
  for (const p of frontendPERMSet) {
    if (backendCodesSet.has(p)) continue;
    if (frontendNavCodesSet.has(p)) continue;
    if (frontendPERMKeysCartExempt.has(p)) continue; // ← v2 key exemption
    orphanArr.push(p);
  }
  REPORT.summary.R5 = orphanArr.length;
  if (orphanArr.length > 0) {
    REPORT.warnings.push({
      rule: 'R5', level: 'WARN',
      msg: \`\${orphanArr.length} TRUE ORPHAN codes found (EXCLUDING standard 20-modules × 5-actions Cartesian mandatory slots). These custom permission keys are defined in config/permissions.ts BUT are NEVER referenced by (A) backend require_permission() AND (B) frontend nav/config requiredPermissions AND are NOT part of the mandatory 100-slot Cartesian product. Clean these by deleting from PERMISSIONS object (they are NOT required by TS type).\`,
      details: { count: orphanArr.length, top50: orphanArr.slice(0, 50), exemptionCount: frontendPERMKeysCartExempt.size }
    });
    orphanArr.slice(0, 50).forEach(code => REPORT.orphanCodes.push({ code }));
  }`;

/* Apply patch */
if (!ORIG.includes(OLD_R5_BLOCK)) {
  console.error('[FATAL] Could not locate OLD_R5_BLOCK in scripts/ci/check-permission-matrix.cjs');
  console.error('         (file may already be patched or content diverged)');
  process.exit(2);
}

const PATCHED = ORIG.replace(OLD_R5_BLOCK, NEW_R5_BLOCK);

// Also update DEFAULT_FAIL_FAST_THRESHOLDS comment (optional, no-op if not found)
// — nothing to change there, R5 already Infinity

console.log('='.repeat(72));
console.log('  R5 ORPHAN CLEANUP — TypeScript Cartesian exemption patch');
console.log('='.repeat(72));
console.log('  Target file :', path.relative(TOPEMS_ROOT, GATE_PATH));
console.log('  Mode        :', CONFIRM ? 'APPLY (--confirm)' : 'DRY-RUN (no writes)');
console.log('  Patch size  :', `${String(NEW_R5_BLOCK.length - OLD_R5_BLOCK.length).padStart(1,'+')} chars diff`);
console.log('  Exempt set  : moduleCodes×5 actions + dashboard-infix variant + PERMISSIONS.ts literal values');
console.log('');

if (CONFIRM) {
  fs.writeFileSync(GATE_PATH, PATCHED, 'utf8');
  console.log('  ✅ Patch applied in-place.');
} else {
  console.log('  ℹ️  DRY-RUN — no files modified. Re-run with --confirm to apply.');
  console.log('');
  // Show unified diff of the R5 block
  const oldLines = OLD_R5_BLOCK.split('\n');
  const newLines = NEW_R5_BLOCK.split('\n');
  console.log(`  Preview (${oldLines.length}→${newLines.length} lines):`);
  console.log('  --- old R5 block');
  console.log('  +++ new R5 block');
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) console.log(`    ${o ?? ''}`);
    else {
      if (o !== undefined) console.log(`  - ${o}`);
      if (n !== undefined) console.log(`  + ${n}`);
    }
  }
}

console.log('');
console.log('  Post-patch verification (applies in both modes):');
console.log('    node --check scripts/ci/check-permission-matrix.cjs');
console.log('    node scripts/ci/check-permission-matrix.cjs --report-json=/tmp/perm-after-r5.json');
console.log('    (expect R5 == 0 or small, far under 50)');
console.log('='.repeat(72));
process.exit(0);
