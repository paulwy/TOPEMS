/**
 * R13 V222 P4 Guardian Test (Layer-2, dual-gate safety net)
 *
 * Guards:
 *   3 ZERO modules: components/templates, ai, microfrontend   MUST === 0
 *   4 BOUND modules: admin ≤ 500, mobile ≤ 400, monitor ≤ 450, mes ≤ 470
 *
 * Calls countByModule() exported from scripts/ci/check-i18n.cjs via Node CJS interop.
 * Runs under vitest (apps/web) in default 'pnpm test' suite.
 * CI will run this; PR cannot merge if ANY assertion fails.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

// Node CJS interop: scripts/ dir is outside tsconfig root.
// vitest ESM loader virtualizes import.meta.url, so we resolve the CJS script
// via absolute path from project root (process.cwd() = apps/web during test run).
const _cjsAbs = path.resolve(process.cwd(), '../../scripts/ci/check-i18n.cjs');
const _require = createRequire(`file://${_cjsAbs}`);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { countByModule } = _require(_cjsAbs);

const ZERO_MODULES = ['components/templates', 'ai', 'microfrontend'] as const;
const BOUND_PAIRS: [string, number][] = [
  ['admin', 500],
  ['mobile', 400],
  ['monitor', 450],
  ['mes', 470],
];

describe('R13 V222 P4 i18n Hardcoded Guardian (3 zero + 4 bound)', () => {
  let counts: Record<string, number> = {};

  it(`pre-fetch counts for all ${ZERO_MODULES.length + BOUND_PAIRS.length} modules`, async () => {
    const allNames = [...ZERO_MODULES, ...BOUND_PAIRS.map(([n]) => n)];
    counts = await countByModule(allNames);
    // sanity: every module count must be a number >= 0
    for (const n of allNames) {
      expect(typeof counts[n]).toBe('number');
      expect(counts[n]).toBeGreaterThanOrEqual(0);
    }
    console.log('\n── R13 P4 Guardian Module Counts ──');
    for (const n of allNames) {
      const bound = BOUND_PAIRS.find(([m]) => m === n)?.[1];
      const status = bound !== undefined
        ? (counts[n] <= bound ? `≤${bound} ✅` : `EXCEEDS ${bound} ❌`)
        : counts[n] === 0 ? 'ZERO ✅' : `!=0 (${counts[n]}) ❌`;
      console.log(`  ${n.padEnd(22)}: ${String(counts[n]).padStart(5)}  ${status}`);
    }
  }, 60000); // 7 modules (possibly 1000+ files) → allow 60s

  // ---- 3 ZERO assertions ----
  ZERO_MODULES.forEach((mod, idx) => {
    it(`[ZERO ${idx + 1}/3] ${mod} MUST have 0 hardcoded CJK`, () => {
      expect(counts[mod]).toBe(0);
    });
  });

  // ---- 4 BOUND assertions ----
  BOUND_PAIRS.forEach(([mod, bound], idx) => {
    it(`[BOUND ${String(idx + 1).padStart(2, '0')}/4] ${mod} MUST be ≤ ${bound}`, () => {
      expect(counts[mod]).toBeLessThanOrEqual(bound);
    });
  });
});
