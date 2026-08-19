#!/usr/bin/env node
/**
 * V215-Batch3 · 简化模板字面量 hex 替换
 *
 * 直接在包含 backtick 和 #hex 的行中替换 hex 为 ${designTokens...}
 * 不使用复杂 lookbehind，而是逐字符检查 hex 是否已在 ${} 内
 *
 * 用法:
 *   node scripts/audit/fix-template-hex.mjs --apply
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.env.TOPEMS_ROOT || '/Users/air/TOPEMS';
const SRC = join(ROOT, 'apps/web/src');
const APPLY = process.argv.includes('--apply');

const IGNORED = [
  '/node_modules/',
  '/dist/',
  '/build/',
  '/coverage/',
  '/test-results/',
  '/playwright-report/',
  '/__tests__/',
  '.stories.',
  '/theme/animations/',
  '/theme/tokens/',
  '/design-system/tokens/',
  '/theme/generated-tokens',
  '/theme/gradients.',
  '/theme/presets.',
  '/theme/theme.',
];

const HEX_MAP = {
  '#0891b2': "designTokens.colors.cyan['600']",
  '#0e7490': "designTokens.colors.cyan['700']",
  '#3b82f6': 'designTokens.colors.primary.main',
  '#4f46e5': 'designTokens.colors.primary.dark',
  '#ed6c02': 'designTokens.colors.warning.dark',
  '#ef6c00': 'designTokens.colors.warning.dark',
  '#fff3e0': "designTokens.colors.warning['50']",
  '#ffebee': "designTokens.colors.error['50']",
  '#ff9800': 'designTokens.colors.warning.main',
  '#f9fafb': "designTokens.colors.grey['50']",
  '#f43f5e': "designTokens.colors.error['500']",
  '#db2777': "designTokens.colors.pink['600']",
  '#2196f3': 'designTokens.colors.primary.main',
  '#111827': 'designTokens.colors.common.black',
  '#0288d1': "designTokens.colors.info['700']",
  '#ffedd5': "designTokens.colors.orange['100']",
  '#f5f5f5': "designTokens.colors.grey['100']",
  '#eef2ff': "designTokens.colors.primary['50']",
  '#e1f5fe': "designTokens.colors.info['50']",
  '#e0e7ff': "designTokens.colors.primary['50']",
  '#cbd5e1': "designTokens.colors.grey['300']",
  '#ddd': "designTokens.colors.grey['300']",
  '#d946ef': "designTokens.colors.purple['500']",
  '#9c27b0': "designTokens.colors.purple['500']",
  '#757575': "designTokens.colors.grey['600']",
  '#4caf50': 'designTokens.colors.success.main',
  '#00838f': "designTokens.colors.teal['700']",
  '#e5e7eb': "designTokens.colors.grey['200']",
  '#94a3b8': "designTokens.colors.grey['400']",
  '#1e40af': "designTokens.colors.primary['800']",
  '#fecaca': "designTokens.colors.error['200']",
  '#0284c7': "designTokens.colors.info['600']",
  '#0f172a': 'designTokens.colors.common.black',
  '#166534': "designTokens.colors.success['800']",
  '#a7f3d0': "designTokens.colors.success['200']",
  '#f0fdf4': "designTokens.colors.success['50']",
  '#eff6ff': "designTokens.colors.primary['50']",
  '#fffbeb': "designTokens.colors.warning['50']",
  '#eab308': "designTokens.colors.warning['500']",
  '#ff3e00': "designTokens.colors.error['600']",
  '#dd0031': "designTokens.colors.error['600']",
  '#8b5cf6': 'designTokens.colors.secondary.main',
  '#a78bfa': 'designTokens.colors.secondary.light',
  '#7c3aed': 'designTokens.colors.secondary.dark',
  '#22c55e': 'designTokens.colors.success.main',
  '#ef4444': 'designTokens.colors.error.main',
  '#dc2626': 'designTokens.colors.error.dark',
  '#f97316': "designTokens.colors.orange['500']",
  '#f59e0b': 'designTokens.colors.warning.main',
  '#d97706': 'designTokens.colors.warning.dark',
  '#6366f1': 'designTokens.colors.primary.dark',
  '#1976d2': 'designTokens.colors.primary.dark',
  '#60a5fa': "designTokens.colors.primary['400']",
  '#1d4ed8': "designTokens.colors.primary['700']",
  '#06b6d4': "designTokens.colors.cyan['500']",
  '#22d3ee': "designTokens.colors.cyan['400']",
  '#0ea5e9': 'designTokens.colors.info.main',
  '#16a34a': 'designTokens.colors.success.dark',
  '#10b981': 'designTokens.colors.success.dark',
  '#059669': 'designTokens.colors.success.dark',
  '#065f46': 'designTokens.colors.success.dark',
  '#2e7d32': 'designTokens.colors.success.dark',
  '#0d9488': "designTokens.colors.teal['600']",
  '#14b8a6': "designTokens.colors.teal['500']",
  '#fbbf24': "designTokens.colors.warning['400']",
  '#ec4899': "designTokens.colors.pink['500']",
  '#64748b': "designTokens.colors.grey['500']",
  '#6b7280': "designTokens.colors.grey['500']",
  '#9ca3af': "designTokens.colors.grey['400']",
  '#9e9e9e': "designTokens.colors.grey['500']",
  '#e0e0e0': "designTokens.colors.grey['300']",
  '#bdbdbd': "designTokens.colors.grey['400']",
  '#c62828': "designTokens.colors.error['800']",
  '#b91c1c': "designTokens.colors.error['800']",
  '#7b1fa2': "designTokens.colors.purple['700']",
  '#38bdf8': "designTokens.colors.info['400']",
  '#ea580c': "designTokens.colors.orange['600']",
  '#f57c00': "designTokens.colors.orange['700']",
  '#92400e': "designTokens.colors.orange['800']",
  '#1565c0': 'designTokens.colors.primary.dark',
  '#ffffff': 'designTokens.colors.common.white',
  '#000000': 'designTokens.colors.common.black',
};

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full);
    const norm = '/' + rel.replaceAll(/\\/g, '/');
    if (IGNORED.some((p) => norm.includes(p))) continue;
    if (entry.isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(extname(entry.name))) files.push(full);
  }
  return files;
}

function replaceHexInLine(line) {
  let count = 0;
  let result = line;

  for (const [hex, token] of Object.entries(HEX_MAP)) {
    for (const variant of [hex, hex.toUpperCase()]) {
      let idx = 0;
      while (true) {
        const pos = result.indexOf(variant, idx);
        if (pos === -1) break;

        // Check if this hex is inside a ${...} expression
        let braceDepth = 0;
        let inExpr = false;
        for (let i = pos - 1; i >= 0; i--) {
          if (result[i] === '}') braceDepth++;
          if (result[i] === '{') {
            if (braceDepth > 0) {
              braceDepth--;
            } else {
              if (i > 0 && result[i - 1] === '$') inExpr = true;
              break;
            }
          }
        }

        if (inExpr) {
          idx = pos + variant.length;
          continue;
        }

        // Check if it's inside a quoted string (already a token reference)
        if (result.substring(pos - 20, pos).includes('designTokens.')) {
          idx = pos + variant.length;
          continue;
        }

        // Replace: wrap in ${}
        const before = result.substring(0, pos);
        const after = result.substring(pos + variant.length);
        result = before + '${' + token + '}' + after;
        count++;
        idx = pos + token.length + 3; // skip past the ${token}
      }
    }
  }

  return { line: result, count };
}

const files = walk(SRC);
console.log(`Scanning ${files.length} files...`);

let totalReplacements = 0;
const results = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let fileCount = 0;
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Only process lines with backtick template literals and hex colors
    if (!line.includes('`') || !line.match(/#[0-9a-fA-F]{3,8}/)) continue;

    const { line: newLine, count } = replaceHexInLine(line);
    if (count > 0) {
      lines[i] = newLine;
      fileCount += count;
      changed = true;
    }
  }

  if (changed) {
    const rel = relative(ROOT, file);
    results.push({ rel, count: fileCount });
    totalReplacements += fileCount;
    if (APPLY) {
      writeFileSync(file, lines.join('\n'), 'utf8');
    }
  }
}

console.log(`\n${APPLY ? 'Applied' : 'Dry-run'}: ${totalReplacements} replacements in ${results.length} files`);
for (const r of results) {
  console.log(`  ${r.rel}: ${r.count}`);
}
if (!APPLY) console.log('Run with --apply to write files');
