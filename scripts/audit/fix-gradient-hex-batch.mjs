#!/usr/bin/env node
/**
 * V214-C · gradient 内嵌 hex 替换脚本
 *
 * 将 CSS 字符串中嵌入的 hex 色值替换为模板字面量 + designTokens 引用。
 * 例: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
 *  → `linear-gradient(135deg, ${designTokens.colors.success.dark} 0%, ${designTokens.colors.success.dark} 100%)`
 *
 * 安全原则：
 *  1. 只处理含 hex 值的 CSS 字符串字面量（单引号或双引号包裹）
 *  2. 跳过含 backtick 的字符串（避免破坏模板字面量）
 *  3. 不跨行匹配（避免匹配多行内容）
 *  4. 跳过主题/token 定义文件
 *  5. 默认 dry-run；--apply 才写文件
 *  6. 自动补 designTokens import
 *
 * 用法:
 *   node scripts/audit/fix-gradient-hex-batch.mjs           # dry run
 *   node scripts/audit/fix-gradient-hex-batch.mjs --apply   # 写文件
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

const SKIP_FILE_RE =
  /apps\/web\/src\/(?:theme\/(?:tokens|palette|index|gradients|generated-tokens|presets)|design-system\/(?:tokens|components\/index))/;

const HEX_MAP = {
  '#8b5cf6': 'designTokens.colors.secondary.main',
  '#a78bfa': 'designTokens.colors.secondary.light',
  '#7c3aed': 'designTokens.colors.secondary.dark',
  '#c4b5fd': "designTokens.colors.secondary['300']",
  '#ddd6fe': "designTokens.colors.secondary['200']",
  '#ede9fe': "designTokens.colors.secondary['100']",
  '#f5f3ff': "designTokens.colors.secondary['50']",
  '#a855f7': "designTokens.colors.purple['500']",
  '#9333ea': "designTokens.colors.purple['600']",
  '#c084fc': "designTokens.colors.purple['400']",
  '#3b82f6': 'designTokens.colors.primary.main',
  '#2563eb': 'designTokens.colors.primary.dark',
  '#60a5fa': "designTokens.colors.primary['400']",
  '#1d4ed8': "designTokens.colors.primary['700']",
  '#1976d2': 'designTokens.colors.primary.dark',
  '#1565c0': 'designTokens.colors.primary.dark',
  '#4f46e5': 'designTokens.colors.primary.dark',
  '#06b6d4': "designTokens.colors.cyan['500']",
  '#0891b2': "designTokens.colors.cyan['600']",
  '#22d3ee': "designTokens.colors.cyan['400']",
  '#0ea5e9': 'designTokens.colors.info.main',
  '#38bdf8': "designTokens.colors.info['400']",
  '#22c55e': 'designTokens.colors.success.main',
  '#16a34a': 'designTokens.colors.success.dark',
  '#10b981': 'designTokens.colors.success.dark',
  '#059669': 'designTokens.colors.success.dark',
  '#065f46': 'designTokens.colors.success.dark',
  '#2e7d32': 'designTokens.colors.success.dark',
  '#0d9488': "designTokens.colors.teal['600']",
  '#14b8a6': "designTokens.colors.teal['500']",
  '#ef4444': 'designTokens.colors.error.main',
  '#dc2626': 'designTokens.colors.error.dark',
  '#f44336': 'designTokens.colors.error.main',
  '#c62828': "designTokens.colors.error['800']",
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
  '#ffffff': 'designTokens.colors.common.white',
  '#000000': 'designTokens.colors.common.black',
  '#64748b': "designTokens.colors.grey['500']",
  '#6b7280': "designTokens.colors.grey['500']",
  '#9ca3af': "designTokens.colors.grey['400']",
  '#9e9e9e': "designTokens.colors.grey['500']",
  '#e0e0e0': "designTokens.colors.grey['300']",
  '#e2e8f0': "designTokens.colors.grey['200']",
  '#1e293b': "designTokens.colors.grey['800']",
  '#0f172a': "designTokens.colors.grey['900']",
  '#374151': "designTokens.colors.grey['700']",
  '#dcfce7': "designTokens.colors.success['100']",
  '#d1fae5': "designTokens.colors.success['100']",
  '#e8f5e9': "designTokens.colors.success['50']",
  '#fef3c7': "designTokens.colors.warning['100']",
  '#e3f2fd': "designTokens.colors.primary['50']",
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

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processFile(filePath) {
  if (SKIP_FILE_RE.test(filePath)) return;
  const orig = readFileSync(filePath, 'utf8');
  let content = orig;
  let count = 0;
  let needsImport = false;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('`')) continue;

    const stringRe = /(['"])((?:[^\\'"\n]|\\.)*?#[0-9a-fA-F]{3,8}(?:[^\\'"\n]|\\.)*)\1/g;

    lines[i] = line.replace(stringRe, (match, quote, inner, offset) => {
      if (inner.includes('`')) return match;

      let modified = inner;
      let hexCount = 0;

      for (const [hex, token] of Object.entries(HEX_MAP)) {
        const re = new RegExp(escapeRegex(hex), 'gi');
        const newModified = modified.replace(re, `\${${token}}`);
        if (newModified !== modified) {
          modified = newModified;
          hexCount++;
          needsImport = true;
        }
      }

      if (hexCount > 0) {
        count += hexCount;
        const before = offset > 0 ? line[offset - 1] : '';
        const isJsxAttr = before === '=';
        if (isJsxAttr) {
          return '{`' + modified + '`}';
        }
        return '`' + modified + '`';
      }
      return match;
    });
  }

  content = lines.join('\n');

  if (count > 0 && APPLY) {
    const hasImport = orig.includes("from '@topems/tokens'") || orig.includes('from "@topems/tokens"');
    if (needsImport && !hasImport) {
      const lines = content.split('\n');
      let lastImportLine = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*(?:import\s|}.*from\s)/.test(lines[i]) && /from\s+['"]/.test(lines[i])) {
          lastImportLine = i;
        }
      }
      if (lastImportLine >= 0) {
        lines.splice(lastImportLine + 1, 0, "import { designTokens } from '@topems/tokens';");
        content = lines.join('\n');
      } else {
        content = "import { designTokens } from '@topems/tokens';\n" + content;
      }
    }
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
for (const { file, count } of fileStats.slice(0, 25)) {
  console.log(`  ${String(count).padStart(4)}  ${file}`);
}
if (fileStats.length > 25) {
  console.log(`  ... and ${fileStats.length - 25} more files`);
}
console.log(`\nTotal: ${totalReplacements} replacements`);
