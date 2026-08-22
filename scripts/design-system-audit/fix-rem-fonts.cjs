#!/usr/bin/env node
'use strict';

/**
 * 批量将硬编码 rem 字号替换为 designTokens.typography.fontSize.scale 引用。
 *
 * 使用方式：
 *   node scripts/design-system-audit/fix-rem-fonts.cjs
 *   node scripts/design-system-audit/fix-rem-fonts.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCAN_ROOTS = ['apps/web/src', 'packages/shared-components/src'];
const SKIP_PATTERNS = [
  /\.css\.ts$/,
  /\.stories\.tsx$/,
  /\.test\.tsx$/,
  /[\\/]design-system[\\/]tokens[\\/]/,
  /[\\/]docs[\\/]DesignTokens\.tsx$/,
  /[\\/]theme[\\/]tokens\.ts$/,
  /[\\/]theme[\\/]design-tokens\.ts$/,
  /[\\/]theme[\\/]dataGridTheme\.ts$/,
];

const regex = /fontSize\s*:\s*(['"])(\d+\.?\d*)rem\1/g;

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(p));
    } else if (/\.(tsx?|jsx?)$/.test(p) && !SKIP_PATTERNS.some((pat) => pat.test(p))) {
      files.push(p);
    }
  }
  return files;
}

function detectAlias(content) {
  // import { designTokens } from '...'
  const direct = content.match(/import\s+\{[^}]*\bdesignTokens\b[^}]*\}\s+from\s+['"][^'"]*['"]/);
  if (direct) return 'designTokens';

  // import { designTokens as ct } from '...'
  const aliasMatch = content.match(/import\s+\{[^}]*\bdesignTokens\s+as\s+(\w+)\b[^}]*\}\s+from\s+['"][^'"]*['"]/);
  if (aliasMatch) return aliasMatch[1];

  return null;
}

function processFile(filePath, dryRun) {
  const relative = path.relative(ROOT, filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  let hasMatch = false;
  content = content.replace(regex, (_match, quote, value) => {
    hasMatch = true;
    return `fontSize: ${detectAlias(content) ?? 'designTokens'}.typography.fontSize.scale['${value}rem']`;
  });

  if (!hasMatch) return false;

  const alias = detectAlias(content);
  if (!alias) {
    const importLine = "import { designTokens } from '@topems/tokens';\n";
    content = importLine + content;
  }

  if (content !== original) {
    if (!dryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}${relative}`);
    return true;
  }
  return false;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

let changed = 0;
for (const root of SCAN_ROOTS) {
  const dir = path.join(ROOT, root);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (processFile(file, dryRun)) changed++;
  }
}

console.log(`\n${dryRun ? 'Would modify' : 'Modified'} ${changed} file(s).`);
