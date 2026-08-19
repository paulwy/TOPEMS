#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

/* [PERM-GATE MILESTONE · V256]
 * - R2 全仓清零（scanR2RealFull · 31 svc · 20 svc 接入 require_permission middleware）
 * - R3 可追溯（findMatchingBraceClose · utoipa admin sec 识别 · rules[R3].hits[] 全字段）
 * - R7 详情输出（double-track anti-pattern hits 详情挂 rules[R7].hits）
 * - ci-report 三模式退出码 + GitHub Step Summary 自动写入（$GITHUB_STEP_SUMMARY）
 * 此 wrapper 将在 V257+ 移除；2 个版本过渡窗口内继续保持外部调用兼容。 */
console.error('[DEPRECATED] check-perm-gate.cjs will be removed in V257+. Use "node scripts/ci/perm-matrix-toolkit.cjs ci-report ..." instead. (Perm-Gate milestone V256: R2=0 full-warehouse · R3 traceable · R7 hits detail)');

const toolkitPath = path.join(__dirname, 'perm-matrix-toolkit.cjs');
const res = spawnSync(process.argv0, [toolkitPath, 'ci-report', ...process.argv.slice(2)], { stdio: 'inherit' });

process.exit(res.status ?? 1);
