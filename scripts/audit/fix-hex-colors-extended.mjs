#!/usr/bin/env node
/**
 * V214-C · hex-color 批量替换脚本（V212 续）
 *
 * 使用 tokens.ts 全量 hex→token 映射，替换组件文件中的硬编码色值。
 * 覆盖 V212 未处理的 20+ 新色值（#8b5cf6 #6366f1 #7c3aed #0ea5e9 等）。
 *
 * 安全原则同 V212：
 *  1. 只替换字符串引号中的完整色值
 *  2. 跳过主题定义 / node_modules / tests / stories
 *  3. 默认 dry-run；--apply 才写文件
 *  4. 不自动补 import（用 fix-missing-designTokens-import.mjs 后处理）
 *
 * 用法:
 *   node scripts/audit/fix-hex-colors-extended.mjs           # dry run
 *   node scripts/audit/fix-hex-colors-extended.mjs --apply   # 写文件
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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
];

const THEME_FILE_RE = /apps\/web\/src\/theme\/(?:tokens|palette|index|gradients|generated-tokens)\.(ts|tsx|css|scss)$/;
const TOKEN_FILE_RE = /apps\/web\/src\/(?:design-system\/tokens|theme\/tokens)\//;

const HEX_MAP = {
  // secondary / purple
  '#8b5cf6': 'colors.secondary.main',
  '#a78bfa': 'colors.secondary.light',
  '#7c3aed': 'colors.secondary.dark',
  '#c4b5fd': 'colors.secondary.300',
  '#ddd6fe': 'colors.secondary.200',
  '#ede9fe': 'colors.secondary.100',
  '#f5f3ff': 'colors.secondary.50',
  '#a855f7': 'colors.purple.500',
  '#9333ea': 'colors.purple.600',
  '#c084fc': 'colors.purple.400',
  '#d8b4fe': 'colors.purple.300',
  // success / green
  '#22c55e': 'colors.success.main',
  '#16a34a': 'colors.success.dark',
  '#86efac': 'colors.success.light',
  '#dcfce7': 'colors.success.100',
  '#d1fae5': 'colors.success.100',
  '#f0fdf4': 'colors.success.50',
  // warning / amber
  '#fef3c7': 'colors.warning.100',
  '#fde68a': 'colors.warning.200',
  '#f59e0b': 'colors.warning.main',
  '#d97706': 'colors.warning.dark',
  // error / red
  '#ef4444': 'colors.error.main',
  '#dc2626': 'colors.error.dark',
  '#fca5a5': 'colors.error.light',
  '#fef2f2': 'colors.error.50',
  '#fee2e2': 'colors.error.100',
  '#991b1b': 'colors.error.800',
  '#c62828': 'colors.error.800',
  // info / sky
  '#0ea5e9': 'colors.info.main',
  '#38bdf8': 'colors.info.400',
  '#0284c7': 'colors.info.600',
  '#075985': 'colors.info.800',
  '#f0f9ff': 'colors.info.50',
  '#e0f2fe': 'colors.info.100',
  '#bae6fd': 'colors.info.200',
  // blue / primary
  '#3b82f6': 'colors.primary.main',
  '#2563eb': 'colors.primary.dark',
  '#60a5fa': 'colors.primary.400',
  '#1976d2': 'colors.primary.dark',
  '#1d4ed8': 'colors.primary.700',
  '#93c5fd': 'colors.primary.300',
  '#dbeafe': 'colors.primary.100',
  // cyan
  '#06b6d4': 'colors.cyan.500',
  '#0891b2': 'colors.cyan.600',
  '#22d3ee': 'colors.cyan.400',
  '#67e8f9': 'colors.cyan.300',
  // teal
  '#0d9488': 'colors.teal.600',
  '#14b8a6': 'colors.teal.500',
  '#2dd4bf': 'colors.teal.400',
  // orange
  '#f97316': 'colors.orange.500',
  '#ea580c': 'colors.orange.600',
  '#fb923c': 'colors.orange.400',
  '#ed6c02': 'colors.orange.700',
  '#fdba74': 'colors.orange.300',
  // pink
  '#ec4899': 'colors.pink.500',
  '#db2777': 'colors.pink.600',
  '#f472b6': 'colors.pink.400',
  // grey / slate
  '#64748b': 'colors.grey.500',
  '#6b7280': 'colors.grey.500',
  '#9ca3af': 'colors.grey.400',
  '#374151': 'colors.grey.700',
  '#4b5563': 'colors.grey.600',
  '#475569': 'colors.grey.600',
  '#1f2937': 'colors.grey.800',
  '#1e293b': 'colors.grey.800',
  '#e2e8f0': 'colors.grey.200',
  '#f1f5f9': 'colors.grey.100',
  '#f3f4f6': 'colors.grey.100',
  // white / black
  '#ffffff': 'colors.common.white',
  '#000000': 'colors.common.black',
  // Material Design legacy colors
  '#1976d2': 'colors.primary.dark',
  '#1565c0': 'colors.primary.dark',
  '#4f46e5': 'colors.primary.dark',
  '#065f46': 'colors.success.dark',
  '#2e7d32': 'colors.success.dark',
  '#f44336': 'colors.error.main',
  '#f57c00': 'colors.orange.700',
  '#92400e': 'colors.orange.800',
  '#fbbf24': 'colors.warning.400',
  '#e0e0e0': 'colors.grey.300',
  '#9e9e9e': 'colors.grey.500',
  '#0f172a': 'colors.grey.900',
  '#e3f2fd': 'colors.primary.50',
  '#e8f5e9': 'colors.success.50',
  '#d1fae5': 'colors.success.100',
  '#dcfce7': 'colors.success.100',
  '#fef3c7': 'colors.warning.100',
  '#374151': 'colors.grey.700',
  '#db2777': 'colors.pink.600',
  '#c62828': 'colors.error.800',
};

let totalReplacements = 0;
const fileStats = [];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (IGNORED.some((p) => full.includes(p))) continue;
    const st = statSync(full);
    if (st.isDirectory()) files.push(...walk(full));
    else if (/\.(tsx?|jsx?)$/.test(extname(full))) files.push(full);
  }
  return files;
}

function processFile(filePath) {
  if (THEME_FILE_RE.test(filePath) || TOKEN_FILE_RE.test(filePath)) return;
  const orig = readFileSync(filePath, 'utf8');
  let content = orig;
  let count = 0;

  for (const [hex, token] of Object.entries(HEX_MAP)) {
    const lowerHex = hex.toLowerCase();
    const upperHex = hex.toUpperCase();

    const patterns = [
      { re: new RegExp(`['"]${lowerHex}['"]`, 'g'), repl: `'${token}'` },
      { re: new RegExp(`['"]${upperHex}['"]`, 'g'), repl: `'${token}'` },
    ];

    for (const { re, repl } of patterns) {
      const matches = content.match(re);
      if (matches) {
        content = content.replace(re, repl);
        count += matches.length;
      }
    }
  }

  if (count > 0 && APPLY) writeFileSync(filePath, content, 'utf8');
  if (count > 0) {
    totalReplacements += count;
    fileStats.push({ file: relative(ROOT, filePath), count });
  }
}

const files = walk(SRC);
console.log(`Scanning ${files.length} files...`);

for (const f of files) processFile(f);

fileStats.sort((a, b) => b.count - a.count);

console.log(
  `\n${APPLY ? '✅ Applied' : '🔍 Dry-run'} — ${totalReplacements} replacements across ${fileStats.length} files\n`
);
for (const { file, count } of fileStats.slice(0, 30)) {
  console.log(`  ${String(count).padStart(4)}  ${file}`);
}
if (fileStats.length > 30) {
  console.log(`  ... and ${fileStats.length - 30} more files`);
}
console.log(`\nTotal: ${totalReplacements} replacements`);
