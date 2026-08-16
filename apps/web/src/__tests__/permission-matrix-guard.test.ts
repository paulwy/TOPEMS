/**
 * Permission Matrix 3-Way Gate Guardian (Layer-2, dual-gate safety net)
 *
 * Design: Spec docs/superpowers/specs/2026-08-16-permission-matrix-gate-design.md
 * Baseline: docs/roadmap/artifacts/rN-perm-matrix-baseline.json (R1=0, R2=0, R3=0)
 *
 * Guarded rules (Layer-2 NEVER-REBOUND):
 *   R1 (backend FORMAT violations)          MUST ≤ 0    (baseline count = 0)
 *   R2 (backend EXISTENCE violations)       MUST ≤ 0    (baseline count = 0)
 *   R3 (frontend nav EXISTENCE violations)  MUST ≤ 0    (baseline count = 0)
 *   Integrity L2                            MUST PASS   (never false-green)
 *
 * Runs runGate() directly from scripts/ci/check-permission-matrix.cjs via
 * Node CJS interop. Takes ~2-5s for 1500+ backend files scan.
 *
 * CI / PR / `pnpm test` all run this; any regression → red build.
 * Developers fix violations to DECREASE the thresholds; NEVER commit a change
 * that increases them (that would defeat Layer-2 "never rebound" guarantee).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

// CJS interop: scripts/ci/*.cjs lives outside tsconfig root, so we use Node require()
// through createRequire anchored at the absolute CJS script path.
// Note: apps/web vitest runs with process.cwd() = apps/web/.
const _cjsAbs = path.resolve(process.cwd(), '../../scripts/ci/check-permission-matrix.cjs');
const _require = createRequire(`file://${_cjsAbs}`);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runGate } = _require(_cjsAbs);

// Baseline thresholds (from rN-perm-matrix-baseline.json)
const BASELINE = Object.freeze({
  R1: 0,
  R2: 0,
  R3: 0,
});

describe('Permission Matrix 3-Way Gate · Guardian (never rebound vs baseline)', () => {
  let report: {
    integrity: { passed: boolean; violations: string[] };
    summary: { R1: number; R2: number; R3: number; R4: number; R5: number; R6: number };
    scanners: Record<string, number>;
  } | null = null;

  beforeAll(async () => {
    // dry-run is enough for guardian (never exit≠1)
    report = (await runGate({ scan: ['backend', 'frontend', 'constants'] })) as any;
    // Console visibility for CI logs
    console.log('\n==== Permission Matrix Guardian Run ====');
    console.log('  Integrity PASS  :', report.integrity.passed);
    console.log('  ── Scanner stats ──');
    Object.keys(report.scanners || {}).forEach(k => {
      console.log(`   . ${k.padEnd(26)} = ${report!.scanners[k]}`);
    });
    console.log('  ── Summary vs Baseline ──');
    (['R1', 'R2', 'R3'] as const).forEach(r => {
      const cur = report!.summary[r];
      const base = (BASELINE as any)[r];
      const status = cur <= base
        ? `≤${base} ✅ (${cur <= base ? 'passed' : 'n/a'}${cur < base ? ' improved: -' + (base - cur) : ''})`
        : `EXCEEDS ${base} ❌ (+${cur - base})`;
      console.log(`   ${r}: ${String(cur).padStart(5)} / baseline ${String(base).padStart(5)}  ·  ${status}`);
    });
    (['R4', 'R5', 'R6'] as const).forEach(r => {
      console.log(`   ${r}: ${String(report!.summary[r]).padStart(5)} · WARN (not guarded)`);
    });
  }, 30000); // 1500+ .rs files scan — allow 30s

  it('Integrity L2 MUST pass (anti-false-green: scanner counts above minima)', () => {
    expect(report).toBeTruthy();
    expect(report!.integrity.passed).toBe(true);
    if (!report!.integrity.passed) {
      console.error('Integrity violations:', report!.integrity.violations);
    }
  });

  it(`R1 backend FORMAT violations MUST ≤ baseline (${BASELINE.R1})`, () => {
    expect(report!.summary.R1).toBeLessThanOrEqual(BASELINE.R1);
  });

  it(`R2 backend EXISTENCE violations MUST ≤ baseline (${BASELINE.R2})`, () => {
    expect(report!.summary.R2).toBeLessThanOrEqual(BASELINE.R2);
  });

  it(`R3 frontend nav PERMISSIONS violations MUST ≤ baseline (${BASELINE.R3})`, () => {
    expect(report!.summary.R3).toBeLessThanOrEqual(BASELINE.R3);
  });
});
