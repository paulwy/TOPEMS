#!/usr/bin/env node
/**
 * V215-Batch2 · 处理剩余高频色值
 *
 * 处理三类场景：
 * 1. 模板字面量中的 hex 值（已有 designTokens 引用的 gradient 字符串）
 *    `linear-gradient(..., #0891b2)` → `linear-gradient(..., ${designTokens.colors.cyan['600']})`
 * 2. 字符串引号中缺少映射的 rgba 值
 *    'rgba(255, 255, 255, 0.08)' → designTokens.glass.bgLight
 * 3. shadow: 属性（非 boxShadow:）中的阴影值
 *    shadow: '0 4px 24px rgba(0,0,0,0.3)' → shadow: designTokens.darkShadows.xl
 *
 * 用法:
 *   node scripts/audit/fix-remaining-colors.mjs           # dry run
 *   node scripts/audit/fix-remaining-colors.mjs --apply   # 写文件
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.env.TOPEMS_ROOT || '/Users/air/TOPEMS';
const SRC = join(ROOT, 'apps/web/src');
const APPLY = process.argv.includes('--apply');

const IGNORED = [
  '/node_modules/', '/dist/', '/build/', '/coverage/',
  '/test-results/', '/playwright-report/', '/__tests__/',
  '.stories.', '/theme/animations/',
  '/theme/tokens/', '/design-system/tokens/',
  '/theme/generated-tokens', '/theme/gradients.',
  '/theme/presets.', '/theme/theme.',
];

const SKIP_FILE_RE =
  /apps\/web\/src\/(?:theme\/(?:tokens|palette|index|gradients|generated-tokens|presets)|design-system\/(?:tokens))/;

// Hex → token mapping for template literal context (uses designTokens prefix)
const HEX_TOKEN_MAP = {
  '#0891b2': "designTokens.colors.cyan['600']",
  '#0e7490': "designTokens.colors.cyan['700']",
  '#3b82f6': 'designTokens.colors.primary.main',
  '#4f46e5': 'designTokens.colors.primary.dark',
  '#ed6c02': 'designTokens.colors.warning.dark',
  '#ef6c00': 'designTokens.colors.warning.dark',
  '#fff3e0': "designTokens.colors.warning['50']",
  '#ffebee': "designTokens.colors.error['50']",
  '#ff9800': 'designTokens.colors.warning.main',
  '#ffffff': 'designTokens.colors.common.white',
  '#000000': 'designTokens.colors.common.black',
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
  '#22c55e': 'designTokens.colors.success.main',
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
};

// rgba → token mapping for string literal context
const RGBA_STRING_MAP = {
  'rgba(0,0,0,0.1)': 'designTokens.colors.action.selected',
  'rgba(0, 0, 0, 0.1)': 'designTokens.colors.action.selected',
  'rgba(0,0,0,0.04)': 'designTokens.colors.action.hover',
  'rgba(0, 0, 0, 0.04)': 'designTokens.colors.action.hover',
  'rgba(0,0,0,0.08)': 'designTokens.colors.action.selected',
  'rgba(0, 0, 0, 0.08)': 'designTokens.colors.action.selected',
  'rgba(0,0,0,0.12)': 'designTokens.colors.action.selected',
  'rgba(0, 0, 0, 0.12)': 'designTokens.colors.action.selected',
  'rgba(0,0,0,0.15)': 'designTokens.colors.action.selected',
  'rgba(0, 0, 0, 0.15)': 'designTokens.colors.action.selected',
  'rgba(0,0,0,0.2)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.2)': 'designTokens.glass.divider',
  'rgba(0,0,0,0.25)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.25)': 'designTokens.glass.divider',
  'rgba(0,0,0,0.3)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.3)': 'designTokens.glass.divider',
  'rgba(0,0,0,0.4)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.4)': 'designTokens.glass.divider',
  'rgba(0,0,0,0.6)': 'designTokens.glass.bottomShadow',
  'rgba(0, 0, 0, 0.6)': 'designTokens.glass.bottomShadow',
  'rgba(0,0,0,0.05)': 'designTokens.colors.action.hover',
  'rgba(0, 0, 0, 0.05)': 'designTokens.colors.action.hover',
  'rgba(0,0,0,0.87)': 'designTokens.colors.text.primary',
  'rgba(0, 0, 0, 0.87)': 'designTokens.colors.text.primary',
  'rgba(0,0,0,0.38)': 'designTokens.colors.text.disabled',
  'rgba(0, 0, 0, 0.38)': 'designTokens.colors.text.disabled',
  'rgba(255,255,255,0.05)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.05)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.08)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.08)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.1)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.1)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.06)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.06)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.2)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.2)': 'designTokens.glass.topLight',
  'rgba(59,130,246,0.2)': 'designTokens.glass.lineHeavy',
  'rgba(59, 130, 246, 0.2)': 'designTokens.glass.lineHeavy',
  'rgba(59,130,246,0.4)': 'designTokens.glass.lineHeavy',
  'rgba(59, 130, 246, 0.4)': 'designTokens.glass.lineHeavy',
  'rgba(139,92,246,0.2)': "designTokens.colors.secondary['500']",
  'rgba(139, 92, 246, 0.2)': "designTokens.colors.secondary['500']",
  'rgba(16,185,129,0.2)': 'designTokens.colors.success.dark',
  'rgba(16, 185, 129, 0.2)': 'designTokens.colors.success.dark',
  'rgba(16,185,129,0.1)': 'designTokens.colors.success.dark',
  'rgba(16, 185, 129, 0.1)': 'designTokens.colors.success.dark',
  'rgba(239,68,68,0.1)': 'designTokens.colors.error.dark',
  'rgba(239, 68, 68, 0.1)': 'designTokens.colors.error.dark',
  'rgba(99,102,241,0.4)': 'designTokens.colors.primary.dark',
  'rgba(99, 102, 241, 0.4)': 'designTokens.colors.primary.dark',
};

// shadow: property → token mapping (non-boxShadow)
const SHADOW_PROP_MAP = {
  "0 4px 24px rgba(0,0,0,0.3)": 'designTokens.darkShadows.xl',
  "0 4px 24px rgba(0, 0, 0, 0.3)": 'designTokens.darkShadows.xl',
  "0 1px 3px rgba(0,0,0,0.1)": 'designTokens.shadows.sm',
  "0 1px 3px rgba(0, 0, 0, 0.1)": 'designTokens.shadows.sm',
  "0 10px 15px -3px rgba(0,0,0,0.1)": 'designTokens.shadows.lg',
  "0 10px 15px -3px rgba(0, 0, 0, 0.1)": 'designTokens.shadows.lg',
  "0 4px 6px -1px rgba(0,0,0,0.1)": 'designTokens.shadows.md',
  "0 4px 6px -1px rgba(0, 0, 0, 0.1)": 'designTokens.shadows.md',
  "0 20px 60px rgba(0,0,0,0.3)": 'designTokens.darkShadows.xl',
  "0 20px 60px rgba(0, 0, 0, 0.3)": 'designTokens.darkShadows.xl',
  "0 24px 80px rgba(0,0,0,0.4)": "designTokens.darkShadows['3xl']",
  "0 24px 80px rgba(0, 0, 0, 0.4)": "designTokens.darkShadows['3xl']",
  "0 25px 50px -12px rgba(0,0,0,0.25)": "designTokens.shadows['2xl']",
  "0 25px 50px -12px rgba(0, 0, 0, 0.25)": "designTokens.shadows['2xl']",
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
    if (/\.(ts|tsx|css|scss)$/.test(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function processFile(filePath) {
  const rel = relative(ROOT, filePath);
  const norm = '/' + rel.replaceAll(/\\/g, '/');
  if (SKIP_FILE_RE.test(norm)) return null;

  let content = readFileSync(filePath, 'utf8');
  const original = content;
  const stats = { templateHex: 0, rgbaString: 0, shadowProp: 0 };

  // 1. Replace hex values inside template literals (backtick strings)
  // Only process lines that contain backtick and #hex pattern
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('`') || !line.match(/#[0-9a-fA-F]{3,8}/)) continue;
    if (line.includes('designTokens') || line.includes('${')) {
      // Template literal with existing designTokens references - replace hex with interpolation
      let newLine = line;
      for (const [hex, token] of Object.entries(HEX_TOKEN_MAP)) {
        const hexLower = hex.toLowerCase();
        const hexUpper = hex.toUpperCase();
        for (const variant of [hex, hexLower, hexUpper]) {
          if (newLine.includes(variant) && !newLine.includes(`${token}`)) {
            const escapedHex = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`(?<!\\$\\{[^}]*|['"])${escapedHex}(?![\\w-])`, 'g');
            const before = (newLine.match(re) || []).length;
            newLine = newLine.replace(re, `\${${token}}`);
            stats.templateHex += before - (newLine.match(re) || []).length;
          }
        }
      }
      lines[i] = newLine;
    }
  }
  content = lines.join('\n');

  // 2. Replace rgba values in string literal context (single/double quotes)
  for (const [rgba, token] of Object.entries(RGBA_STRING_MAP)) {
    const escapedRgba = rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Single quote
    const singleRe = new RegExp(`'${escapedRgba}'`, 'g');
    const beforeS = (content.match(singleRe) || []).length;
    content = content.replace(singleRe, token);
    stats.rgbaString += beforeS - (content.match(singleRe) || []).length;

    // Double quote
    const doubleRe = new RegExp(`"${escapedRgba}"`, 'g');
    const beforeD = (content.match(doubleRe) || []).length;
    content = content.replace(doubleRe, token);
    stats.rgbaString += beforeD - (content.match(doubleRe) || []).length;
  }

  // 3. Replace shadow: property values (non-boxShadow)
  for (const [pattern, token] of Object.entries(SHADOW_PROP_MAP)) {
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // shadow: 'pattern'
    const singleRe = new RegExp(`shadow:\\s*'${escapedPattern}'`, 'g');
    const beforeS = (content.match(singleRe) || []).length;
    content = content.replace(singleRe, `shadow: ${token}`);
    stats.shadowProp += beforeS - (content.match(singleRe) || []).length;

    // shadow: "pattern"
    const doubleRe = new RegExp(`shadow:\\s*"${escapedPattern}"`, 'g');
    const beforeD = (content.match(doubleRe) || []).length;
    content = content.replace(doubleRe, `shadow: ${token}`);
    stats.shadowProp += beforeD - (content.match(doubleRe) || []).length;
  }

  if (content === original) return null;
  return { rel, content, stats };
}

const files = walk(SRC);
console.log(`Scanning ${files.length} files...`);

let totalReplacements = 0;
const results = [];

for (const file of files) {
  const result = processFile(file);
  if (result) {
    results.push(result);
    totalReplacements += result.stats.templateHex + result.stats.rgbaString + result.stats.shadowProp;
  }
}

if (results.length === 0) {
  console.log('\n🔍 Dry-run — 0 replacements across 0 files\n');
} else {
  console.log(`\n🔍 ${APPLY ? 'Applied' : 'Dry-run'} — ${totalReplacements} replacements across ${results.length} files\n`);
  for (const r of results) {
    console.log(`  ${r.rel}: templateHex=${r.stats.templateHex} rgbaString=${r.stats.rgbaString} shadowProp=${r.stats.shadowProp}`);
  }
}

console.log(`\nTotal: ${totalReplacements} replacements`);
if (!APPLY) console.log('Run with --apply to write files');
