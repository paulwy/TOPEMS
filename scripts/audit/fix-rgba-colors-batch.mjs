#!/usr/bin/env node
/**
 * V214-C · rgb-color 批量替换脚本
 *
 * 将组件文件中常见 rgba 模式替换为 designTokens 引用。
 * 跳过主题/token 定义文件（token 文件中 rgba 是合法定义）。
 *
 * 映射策略：
 *  - rgba(0,0,0,0.04) → 'colors.action.hover'
 *  - rgba(0,0,0,0.08) → 'colors.action.selected'
 *  - rgba(255,255,255,0.06) → 'glass.bgLight'
 *  - rgba(255,255,255,0.1) → 'glass.topLight'
 *  - rgba(59,130,246,0.X) → 'glass.lineHeavy' (alpha 不精确匹配时跳过)
 *  - rgba(148,163,184,0.X) → 'glass.border'/'glass.divider'/'glass.line'
 *
 * 用法:
 *   node scripts/audit/fix-rgba-colors-batch.mjs           # dry run
 *   node scripts/audit/fix-rgba-colors-batch.mjs --apply   # 写文件
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
];

const SKIP_FILE_RE =
  /apps\/web\/src\/(?:theme\/(?:tokens|palette|index|gradients|generated-tokens|presets)|design-system\/(?:tokens|components\/index)|dev-tools\/MicroFrontend)/;

const RGBA_MAP = {
  // black overlays → MUI action tokens
  'rgba(0,0,0,0.04)': 'colors.action.hover',
  'rgba(0, 0, 0, 0.04)': 'colors.action.hover',
  'rgba(0,0,0,0.08)': 'colors.action.selected',
  'rgba(0, 0, 0, 0.08)': 'colors.action.selected',
  // black medium → glass metal
  'rgba(0,0,0,0.55)': 'glass.bottomShadow',
  'rgba(0, 0, 0, 0.55)': 'glass.bottomShadow',
  // white overlays → glass tokens
  'rgba(255,255,255,0.06)': 'glass.bgLight',
  'rgba(255, 255, 255, 0.06)': 'glass.bgLight',
  'rgba(255,255,255,0.1)': 'glass.topLight',
  'rgba(255, 255, 255, 0.1)': 'glass.topLight',
  'rgba(255,255,255,0.10)': 'glass.topLight',
  'rgba(255, 255, 255, 0.10)': 'glass.topLight',
  // slate/grey overlays → glass
  'rgba(148,163,184,0.22)': 'glass.border',
  'rgba(148, 163, 184, 0.22)': 'glass.border',
  'rgba(148,163,184,0.18)': 'glass.divider',
  'rgba(148, 163, 184, 0.18)': 'glass.divider',
  'rgba(148,163,184,0.12)': 'glass.line',
  'rgba(148, 163, 184, 0.12)': 'glass.line',
  // blue accent
  'rgba(59,130,246,0.25)': 'glass.lineHeavy',
  'rgba(59, 130, 246, 0.25)': 'glass.lineHeavy',
  // cyber gradient components
  'rgba(34,211,238,0.20)': 'glass.accentCross',
  'rgba(34, 211, 238, 0.20)': 'glass.accentCross',
  // dark glass
  'rgba(15,23,42,0.65)': 'glass.bg',
  'rgba(15, 23, 42, 0.65)': 'glass.bg',
  'rgba(15,23,42,0.82)': 'glass.bgHeavy',
  'rgba(15, 23, 42, 0.82)': 'glass.bgHeavy',
};

let totalReplacements = 0;
const fileStats = [];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (IGNORED.some(p => full.includes(p))) continue;
    const st = statSync(full);
    if (st.isDirectory()) files.push(...walk(full));
    else if (/\.(tsx?|jsx?|css|scss)$/.test(extname(full))) files.push(full);
  }
  return files;
}

function processFile(filePath) {
  if (SKIP_FILE_RE.test(filePath)) return;
  const orig = readFileSync(filePath, 'utf8');
  let content = orig;
  let count = 0;

  for (const [rgba, token] of Object.entries(RGBA_MAP)) {
    // Match rgba in string context: 'rgba(...)'  or "rgba(...)"
    const escapedRgba = rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`['"]${escapedRgba}['"]`, 'g');
    const matches = content.match(re);
    if (matches) {
      content = content.replace(re, `'${token}'`);
      count += matches.length;
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

console.log(`\n${APPLY ? '✅ Applied' : '🔍 Dry-run'} — ${totalReplacements} replacements across ${fileStats.length} files\n`);
for (const { file, count } of fileStats.slice(0, 20)) {
  console.log(`  ${String(count).padStart(4)}  ${file}`);
}
if (fileStats.length > 20) {
  console.log(`  ... and ${fileStats.length - 20} more files`);
}
console.log(`\nTotal: ${totalReplacements} replacements`);
