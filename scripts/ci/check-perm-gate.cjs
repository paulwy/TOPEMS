#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

console.error('[DEPRECATED] check-perm-gate.cjs will be removed in V257+. Use "node scripts/ci/perm-matrix-toolkit.cjs ci-report ..." instead.');

const toolkitPath = path.join(__dirname, 'perm-matrix-toolkit.cjs');
const res = spawnSync(process.argv0, [toolkitPath, 'ci-report', ...process.argv.slice(2)], { stdio: 'inherit' });

process.exit(res.status ?? 1);
