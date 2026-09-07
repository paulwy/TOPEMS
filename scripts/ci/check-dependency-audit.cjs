#!/usr/bin/env node
/**
 * Dependency Security Gate (V515)
 *
 * Runs `pnpm audit` against the official npm registry and fails the build when
 * a CRITICAL advisory appears that is not on the allowlist.
 *
 * Rationale:
 *  - Local default registry (npmmirror) lacks the audit endpoint, so the
 *    official registry is forced explicitly.
 *  - Critical advisories on the allowlist are known, dev-only build-chain
 *    issues (decompress / tar / vitest) with no runtime exposure; see
 *    dependency-audit-allowlist.json.
 *  - Any NEW critical advisory (not on the allowlist) blocks CI so newly
 *    introduced vulnerabilities cannot slip through.
 *
 * Usage: node scripts/ci/check-dependency-audit.cjs
 * Exit codes: 0 = pass, 1 = blocking advisories found
 */
'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ALLOWLIST = new Set(
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'dependency-audit-allowlist.json'),
      'utf8'
    )
  ).advisories
);

function main() {
  let raw = '';
  try {
    raw = execSync('pnpm audit --registry https://registry.npmjs.org --json', {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
  } catch (err) {
    // pnpm audit exits non-zero when vulnerabilities exist; stdout still holds JSON
    raw = (err.stdout ? err.stdout.toString() : '') || raw;
    if (!raw) {
      console.error('❌ pnpm audit failed to produce output:', err.message || err);
      process.exit(1);
    }
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('❌ Failed to parse pnpm audit JSON output');
    process.exit(1);
  }

  const advisories = data.advisories || {};
  const critical = Object.entries(advisories)
    .filter(([, v]) => v && v.severity === 'critical')
    .sort((a, b) => a[0].localeCompare(b[0]));

  const blockers = critical.filter(([id]) => !ALLOWLIST.has(id));

  // ── Summary ──────────────────────────────────────────────────────────────
  const lines = ['## Dependency Security Audit (pnpm audit @ npmjs)', ''];
  const meta = (data.metadata || {}).vulnerabilities || {};
  const total =
    meta.total ??
    (meta.critical ?? 0) + (meta.high ?? 0) + (meta.moderate ?? 0) + (meta.low ?? 0);
  lines.push(
    `| severity | count |`,
    `| --- | --- |`,
    `| critical | ${meta.critical ?? 0} |`,
    `| high | ${meta.high ?? 0} |`,
    `| moderate | ${meta.moderate ?? 0} |`,
    `| low | ${meta.low ?? 0} |`,
    `| total | ${total} |`,
    ''
  );

  if (critical.length === 0) {
    lines.push('✅ No critical advisories.');
  } else {
    lines.push('**Critical advisories:**');
    lines.push('', '| advisory | package | allowlisted |', '| --- | --- | --- |');
    for (const [id, v] of critical) {
      const allowed = ALLOWLIST.has(id) ? '✅ yes' : '⛔ NO — BLOCKS';
      lines.push(`| ${id} | ${v.module_name} | ${allowed} |`);
    }
    lines.push('');
  }

  if (blockers.length > 0) {
    lines.push('⛔ **New critical advisory(ies) not on the allowlist — CI blocked.**');
    lines.push(
      'Action: upgrade the dependency or add the advisory id to ' +
        '`scripts/ci/dependency-audit-allowlist.json` only after verifying it is ' +
        'a dev-only, accepted-risk issue.'
    );
    console.error(lines.join('\n'));
    process.exit(1);
  }

  lines.push('✅ Gate passed: no un-allowlisted critical advisories.');
  console.log(lines.join('\n'));
  process.exit(0);
}

main();
