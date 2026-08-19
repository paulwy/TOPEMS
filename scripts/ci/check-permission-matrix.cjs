#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

console.error('[DEPRECATED] check-permission-matrix.cjs will be removed in V257+. Use "node scripts/ci/perm-matrix-toolkit.cjs ci-report" or "node scripts/ci/perm-matrix-toolkit.cjs matrix" instead.');

const args = process.argv.slice(2);
const hasOut = args.some(a => a === '--out' || a.startsWith('--out='));
const hasMatrixFlag = args.includes('--matrix');

const subcommand = (hasOut || hasMatrixFlag) ? 'matrix' : 'ci-report';

const toolkitPath = path.join(__dirname, 'perm-matrix-toolkit.cjs');
const res = spawnSync(process.argv0, [toolkitPath, subcommand, ...args], { stdio: 'inherit' });

process.exit(res.status ?? 1);
