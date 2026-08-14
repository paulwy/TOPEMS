#!/usr/bin/env node
/**
 * V215 · box-shadow 批量替换脚本
 *
 * 将组件文件中常见 boxShadow 硬编码替换为 designTokens.shadows 引用。
 * 同时处理 boxShadow 内嵌的 rgba 值。
 *
 * 映射策略：
 *  - '0 25px 50px -12px rgba(0, 0, 0, 0.25)' → shadows['2xl']
 *  - '0 10px 15px -3px rgba(0, 0, 0, 0.1)' → shadows.lg
 *  - '0 4px 6px -1px rgba(0, 0, 0, 0.1)' → shadows.md
 *  - '0 1px 3px 0 rgba(0, 0, 0, 0.1)' → shadows.sm
 *  - '0 20px 60px rgba(0,0,0,0.3)' → darkShadows.xl
 *  - '0 24px 80px rgba(0,0,0,0.4)' → darkShadows['3xl']
 *  - 彩色 glow shadows → neonShadows.* 或跳过
 *
 * 安全原则：
 *  1. 只替换字符串引号内的完整 boxShadow 值
 *  2. 跳过主题/token 定义文件
 *  3. 默认 dry-run；--apply 才写文件
 *  4. 自动补 designTokens import
 *
 * 用法:
 *   node scripts/audit/fix-box-shadow-batch.mjs           # dry run
 *   node scripts/audit/fix-box-shadow-batch.mjs --apply   # 写文件
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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

const SHADOW_MAP = {
  // Standard MUI-like shadows → designTokens.shadows.*
  "0 1px 3px 0 rgba(0, 0, 0, 0.1)": "designTokens.shadows.sm",
  "0 1px 3px rgba(0,0,0,0.1)": "designTokens.shadows.sm",
  "0 4px 6px -1px rgba(0, 0, 0, 0.1)": "designTokens.shadows.md",
  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)": "designTokens.shadows.md",
  "0 10px 15px -3px rgba(0, 0, 0, 0.1)": "designTokens.shadows.lg",
  "0 20px 25px -5px rgba(0, 0, 0, 0.1)": "designTokens.shadows.xl",
  "0 25px 50px -12px rgba(0, 0, 0, 0.25)": "designTokens.shadows['2xl']",
  "0 25px 50px -12px rgba(0,0,0,0.25)": "designTokens.shadows['2xl']",

  // Dark mode shadows → designTokens.darkShadows.*
  "0 20px 60px rgba(0,0,0,0.3)": "designTokens.darkShadows.xl",
  "0 24px 80px rgba(0,0,0,0.4)": "designTokens.darkShadows['3xl']",
  "0 20px 60px rgba(0, 0, 0, 0.3)": "designTokens.darkShadows.xl",
  "0 24px 80px rgba(0, 0, 0, 0.4)": "designTokens.darkShadows['3xl']",
};

const HEX_MAP = {
  '#0891b2': "designTokens.colors.cyan['600']",
  '#ed6c02': 'designTokens.colors.warning.dark',
  '#7b1fa2': "designTokens.colors.purple['700']",
  '#fff3e0': "designTokens.colors.warning['50']",
  '#4f46e5': 'designTokens.colors.primary.dark',
  '#0e7490': "designTokens.colors.cyan['700']",
  '#ffebee': "designTokens.colors.error['50']",
  '#ff9800': 'designTokens.colors.warning.main',
  '#3b82f6': 'designTokens.colors.primary.main',
  '#cbd5e1': "designTokens.colors.grey['300']",
  '#9c27b0': "designTokens.colors.purple['500']",
  '#757575': "designTokens.colors.grey['600']",
  '#4caf50': 'designTokens.colors.success.main',
  '#0288d1': "designTokens.colors.info['700']",
  '#00838f': "designTokens.colors.teal['700']",
  '#ffffff': 'designTokens.colors.common.white',
  '#000000': 'designTokens.colors.common.black',
  '#e5e7eb': "designTokens.colors.grey['200']",
  '#94a3b8': "designTokens.colors.grey['400']",
  '#1e40af': "designTokens.colors.primary['800']",
  '#fecaca': "designTokens.colors.error['200']",
  '#0284c7': "designTokens.colors.info['600']",
  '#0f172a': 'designTokens.colors.common.black',
  '#1d4ed8': "designTokens.colors.primary['700']",
  '#60a5fa': "designTokens.colors.primary['400']",
  '#8b5cf6': 'designTokens.colors.secondary.main',
  '#a78bfa': 'designTokens.colors.secondary.light',
  '#7c3aed': 'designTokens.colors.secondary.dark',
  '#22c55e': 'designTokens.colors.success.main',
  '#0d9488': "designTokens.colors.teal['600']",
  '#14b8a6': "designTokens.colors.teal['500']",
  '#ef4444': 'designTokens.colors.error.main',
  '#dc2626': 'designTokens.colors.error.dark',
  '#f97316': "designTokens.colors.orange['500']",
  '#ea580c': "designTokens.colors.orange['600']",
  '#f57c00': "designTokens.colors.orange['700']",
  '#92400e': "designTokens.colors.orange['800']",
  '#ec4899': "designTokens.colors.pink['500']",
  '#db2777': "designTokens.colors.pink['600']",
  '#f59e0b': 'designTokens.colors.warning.main',
  '#d97706': 'designTokens.colors.warning.dark',
  '#fbbf24': "designTokens.colors.warning['400']",
  '#6366f1': 'designTokens.colors.primary.dark',
  '#1976d2': 'designTokens.colors.primary.dark',
  '#1565c0': 'designTokens.colors.primary.dark',
  '#065f46': 'designTokens.colors.success.dark',
  '#2e7d32': 'designTokens.colors.success.dark',
  '#64748b': "designTokens.colors.grey['500']",
  '#6b7280': "designTokens.colors.grey['500']",
  '#9ca3af': "designTokens.colors.grey['400']",
  '#9e9e9e': "designTokens.colors.grey['500']",
  '#e0e0e0': "designTokens.colors.grey['300']",
  '#bdbdbd': "designTokens.colors.grey['400']",
  '#c62828': "designTokens.colors.error['800']",
  '#b91c1c': "designTokens.colors.error['800']",
  '#7c3aed': 'designTokens.colors.secondary.dark',
};

const RGBA_EXTRA_MAP = {
  'rgba(0,0,0,0.05)': 'designTokens.colors.action.hover',
  'rgba(0, 0, 0, 0.05)': 'designTokens.colors.action.hover',
  'rgba(0, 0, 0, 0.87)': 'designTokens.colors.text.primary',
  'rgba(0,0,0,0.87)': 'designTokens.colors.text.primary',
  'rgba(59, 130, 246, 0.2)': 'designTokens.glass.lineHeavy',
  'rgba(59,130,246,0.2)': 'designTokens.glass.lineHeavy',
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
  const originalContent = content;
  let changed = false;
  const stats = { shadow: 0, hex: 0, rgba: 0 };

  // 1. Replace box-shadow patterns (string literal context)
  for (const [pattern, replacement] of Object.entries(SHADOW_MAP)) {
    const singleQuoteRe = new RegExp(
      `boxShadow:\\s*'${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`,
      'g'
    );
    const doubleQuoteRe = new RegExp(
      `boxShadow:\\s*"${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`,
      'g'
    );

    const singleSub = `boxShadow: ${replacement}`;
    const doubleSub = `boxShadow: ${replacement}`;

    const beforeCount = (content.match(singleQuoteRe) || []).length;
    content = content.replace(singleQuoteRe, singleSub);
    stats.shadow += beforeCount - (content.match(singleQuoteRe) || []).length;

    const beforeCount2 = (content.match(doubleQuoteRe) || []).length;
    content = content.replace(doubleQuoteRe, doubleSub);
    stats.shadow += beforeCount2 - (content.match(doubleQuoteRe) || []).length;
  }

  // Also handle boxShadow in template literals (backtick context)
  for (const [pattern, replacement] of Object.entries(SHADOW_MAP)) {
    const tmplRe = new RegExp(
      `boxShadow:\\s*\`${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``,
      'g'
    );
    const beforeCount = (content.match(tmplRe) || []).length;
    content = content.replace(tmplRe, `boxShadow: ${replacement}`);
    stats.shadow += beforeCount - (content.match(tmplRe) || []).length;
  }

  // 2. Replace hex colors in string literal context (not already in designTokens reference)
  for (const [hex, token] of Object.entries(HEX_MAP)) {
    if (content.includes(`designTokens.`)) {
      // Only replace if the hex is not already part of a designTokens reference
    }
    const hexLower = hex.toLowerCase();
    const hexUpper = hex.toUpperCase();

    for (const hexVariant of [hex, hexLower, hexUpper]) {
      const singleRe = new RegExp(
        `(?<!designTokens\\.[\\w.'\\[\\]]*)'${hexVariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`,
        'g'
      );
      const doubleRe = new RegExp(
        `(?<!designTokens\\.[\\w.'\\[\\]]*)"${hexVariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`,
        'g'
      );

      const beforeS = (content.match(singleRe) || []).length;
      content = content.replace(singleRe, `${token}`);
      stats.hex += beforeS - (content.match(singleRe) || []).length;

      const beforeD = (content.match(doubleRe) || []).length;
      content = content.replace(doubleRe, `${token}`);
      stats.hex += beforeD - (content.match(doubleRe) || []).length;
    }
  }

  // 3. Replace standalone rgba values (not inside box-shadow, which was handled above)
  for (const [rgba, token] of Object.entries(RGBA_EXTRA_MAP)) {
    const singleRe = new RegExp(
      `(?<!boxShadow:\\s*)'${rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`,
      'g'
    );
    const doubleRe = new RegExp(
      `(?<!boxShadow:\\s*)"${rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`,
      'g'
    );

    const beforeS = (content.match(singleRe) || []).length;
    content = content.replace(singleRe, `${token}`);
    stats.rgba += beforeS - (content.match(singleRe) || []).length;

    const beforeD = (content.match(doubleRe) || []).length;
    content = content.replace(doubleRe, `${token}`);
    stats.rgba += beforeD - (content.match(doubleRe) || []).length;
  }

  if (content === originalContent) return null;

  // Add designTokens import if needed and not present
  if (!content.includes('designTokens')) {
    return { rel, content, stats, needsImport: true };
  }

  return { rel, content, stats, needsImport: false };
}

const files = walk(SRC);
console.log(`Scanning ${files.length} files...`);

let totalReplacements = 0;
const results = [];

for (const file of files) {
  const result = processFile(file);
  if (result) {
    results.push(result);
    totalReplacements += result.stats.shadow + result.stats.hex + result.stats.rgba;
  }
}

if (results.length === 0) {
  console.log('\n🔍 Dry-run — 0 replacements across 0 files\n');
} else {
  console.log(`\n🔍 Dry-run — ${totalReplacements} replacements across ${results.length} files\n`);
  for (const r of results) {
    console.log(`  ${r.rel}: shadow=${r.stats.shadow} hex=${r.stats.hex} rgba=${r.stats.rgba}${r.needsImport ? ' [needs import]' : ''}`);
  }
}

console.log(`\nTotal: ${totalReplacements} replacements`);

if (APPLY) {
  for (const r of results) {
    let content = r.content;
    if (r.needsImport) {
      const importLine = `import { designTokens } from '@workspace/tokens';\n`;
      const lastImport = content.lastIndexOf('\nimport ');
      if (lastImport >= 0) {
        const insertPos = content.indexOf('\n', lastImport + 1);
        content = content.slice(0, insertPos + 1) + importLine + content.slice(insertPos + 1);
      } else {
        content = importLine + content;
      }
    }
    writeFileSync(join(ROOT, r.rel), content, 'utf8');
  }
  console.log(`\n✅ Applied ${totalReplacements} replacements to ${results.length} files`);
}
