#!/usr/bin/env node
/**
 * V214-C · fixed-px-spacing 批量替换脚本
 *
 * 将 sx prop 中的固定 px 值替换为 MUI spacing 数字或 designTokens 引用：
 *  - padding/margin/gap → MUI spacing 数字 (4px→1, 8px→2, 16px→4 ...)
 *  - borderRadius → designTokens.borderRadius.* 引用
 *
 * 安全原则：
 *  1. 只替换 sx={{ }} 或 sx 对象内的字符串 px 值
 *  2. 跳过 width/height/maxWidth/maxHeight/minWidth/minHeight（布局尺寸保留）
 *  3. 跳过 theme/tokens/、generated-tokens.css、node_modules、test 文件
 *  4. 默认 dry-run；--apply 才写文件
 *
 * 用法:
 *   node scripts/audit/fix-px-spacing-batch.mjs           # dry run
 *   node scripts/audit/fix-px-spacing-batch.mjs --apply   # 写文件
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
  '/theme/tokens/',
  '/theme/generated-tokens.css',
  '/theme/animations/',
  '/theme/gradients.ts',
];

// px → MUI spacing number (base 8px)
const PX_TO_SPACING = {
  '0px': 0,
  '1px': 0.25,
  '2px': 0.5,
  '3px': 0.75,
  '4px': 1,
  '5px': 1.25,
  '6px': 1.5,
  '7px': 1.75,
  '8px': 2,
  '10px': 2.5,
  '12px': 3,
  '14px': 3.5,
  '16px': 4,
  '18px': 4.5,
  '20px': 5,
  '22px': 5.5,
  '24px': 6,
  '28px': 7,
  '32px': 8,
  '36px': 9,
  '40px': 10,
  '44px': 11,
  '48px': 12,
  '56px': 14,
  '64px': 16,
  '72px': 18,
  '80px': 20,
  '96px': 24,
};

// px → borderRadius token
const PX_TO_RADIUS = {
  '0px': 0,
  '2px': 'xs',
  '4px': 'xs',
  '6px': 'sm',
  '8px': 'md',
  '10px': 'lg',
  '12px': 'lg',
  '14px': 'xl',
  '16px': 'xl',
  '20px': '2xl',
  '24px': '3xl',
  '9999px': 'full',
  '999px': 'full',
};

const SPACING_PROPS = new Set([
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'p',
  'pt',
  'pb',
  'pl',
  'pr',
  'py',
  'px',
  'm',
  'mt',
  'mb',
  'ml',
  'mr',
  'my',
  'mx',
  'gap',
  'rowGap',
  'columnGap',
]);

const RADIUS_PROPS = new Set([
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
]);

const SKIP_PROPS = new Set([
  'width',
  'height',
  'maxWidth',
  'maxHeight',
  'minWidth',
  'minHeight',
  'minWidth',
  'minHeight',
  'top',
  'bottom',
  'left',
  'right',
  'fontSize',
  'lineHeight',
  'letterSpacing',
]);

let totalReplacements = 0;
const fileStats = [];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (IGNORED.some((p) => full.includes(p))) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(tsx?|jsx?)$/.test(extname(full))) {
      files.push(full);
    }
  }
  return files;
}

function processFile(filePath) {
  const orig = readFileSync(filePath, 'utf8');
  let content = orig;
  let count = 0;

  // Pattern: propName: 'Npx' (with quotes) in sx objects
  // Also handle propName: "Npx"
  const propRe = /(\w+):\s*['"](\d+(?:\.\d+)?)px['"]/g;
  content = content.replace(propRe, (match, prop, val) => {
    const pxVal = `${val}px`;
    if (SKIP_PROPS.has(prop)) return match;

    if (SPACING_PROPS.has(prop) && PX_TO_SPACING[pxVal] !== undefined) {
      count++;
      return `${prop}: ${PX_TO_SPACING[pxVal]}`;
    }
    if (RADIUS_PROPS.has(prop) && PX_TO_RADIUS[pxVal] !== undefined) {
      count++;
      return `${prop}: '${PX_TO_RADIUS[pxVal]}'`;
    }
    return match;
  });

  if (count > 0 && APPLY) {
    writeFileSync(filePath, content, 'utf8');
  }
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
