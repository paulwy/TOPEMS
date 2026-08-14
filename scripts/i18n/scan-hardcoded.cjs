#!/usr/bin/env node
/**
 * Scan hardcoded Chinese strings in the codebase.
 * Excludes lines with i18n.t(), t(), or comments.
 */
const fs = require('fs');
const path = require('path');

const WEB_SRC = path.resolve('apps/web/src');
const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', '__tests__'];
const SKIP_EXT = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.stories.tsx'];
const SKIP_FILES = /\/(locales|i18n|\.test\.|\.spec\.|\.stories\.)/;

const stats = {};
const moduleStats = {};
let total = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      walk(path.join(dir, entry.name));
    } else if (/\.[mc]?[tj]sx?$/.test(entry.name)) {
      if (SKIP_EXT.some(ext => entry.name.endsWith(ext))) continue;
      scanFile(path.join(dir, entry.name));
    }
  }
}

function scanFile(filePath) {
  if (SKIP_FILES.test(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const rel = path.relative(WEB_SRC, filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!CJK.test(line)) continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.startsWith('import ')) continue;

    if (line.includes('i18n.t(') || line.includes("i18n.t(") || /\bt\s*\(/.test(line) && !line.includes('const') && !line.includes('function')) {
      if (line.match(/\bt\s*\(\s*['"`]/) || line.includes('i18n.t(')) {
        continue;
      }
    }

    const parts = rel.split('/');
    const module = parts[0];
    const subModule = parts.length > 1 ? parts.slice(0, 2).join('/') : module;

    if (!stats[module]) stats[module] = 0;
    stats[module]++;
    if (!moduleStats[subModule]) moduleStats[subModule] = 0;
    moduleStats[subModule]++;
    total++;
  }
}

walk(WEB_SRC);

console.log(`\n=== Hardcoded Chinese Scan ===`);
console.log(`Total: ${total} lines\n`);

console.log('--- By Module ---');
const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
for (const [mod, count] of sorted) {
  console.log(`  ${mod}: ${count}`);
}

console.log('\n--- Top 30 Sub-modules ---');
const sortedSub = Object.entries(moduleStats).sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [mod, count] of sortedSub) {
  console.log(`  ${mod}: ${count}`);
}
