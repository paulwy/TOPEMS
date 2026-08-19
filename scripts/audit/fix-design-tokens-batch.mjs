#!/usr/bin/env node
/**
 * V212-C2 · Design Token 批量替换脚本
 *
 * 对 apps/web/src 下常见硬编码色值按映射表批量替换为
 * designTokens.colors.* / semanticTokens.* 引用。
 *
 * 安全原则：
 *  1. 只替换字符串引号中的完整色值 ('#hex' / "#hex" / 'rgba(...)')
 *  2. 跳过主题定义 / node_modules / tests / stories / animations
 *  3. 默认 dry-run；追加 --apply 才真正写文件
 *  4. 不自动补 import（留给 L2b 手修时按组件统一补）
 *
 * 用法:
 *   node scripts/audit/fix-design-tokens-batch.mjs           # dry run
 *   node scripts/audit/fix-design-tokens-batch.mjs --apply   # 真正写文件
 *   node scripts/audit/fix-design-tokens-batch.mjs --report  # 只打印不做样本裁剪
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.env.TOPEMS_ROOT || '/Users/air/TOPEMS';
const SRC = join(ROOT, 'apps/web/src');
const REPORT_DIR = join(ROOT, 'docs/audit');

const IGNORED_PATH_PARTS = [
  '/node_modules/',
  '/dist/',
  '/build/',
  '/coverage/',
  '/test-results/',
  '/playwright-report/',
  '/theme/animations/',
  '/__tests__/',
  '.stories.',
];

const THEME_FILE_RE = /apps\/web\/src\/theme\/(?:tokens|palette|index)\.(ts|tsx|css|scss)$/;

// ─── 色值 → 设计 Token 映射表（Top 10+） ───

const HEX_MAP = {
  // success / emerald
  '#10b981': { token: 'colors.success.dark' },
  '#059669': { token: 'colors.success.dark' },
  '#0d9488': { token: 'colors.teal.600' },
  '#ecfdf5': { token: 'colors.success.50' },
  '#2e7d32': { token: 'colors.success.dark' },
  // amber / warning
  '#f59e0b': { token: 'colors.warning.main' },
  '#d97706': { token: 'colors.warning.dark' },
  // red / error / danger
  '#ef4444': { token: 'colors.error.main' },
  '#dc2626': { token: 'colors.error.dark' },
  '#d32f2f': { token: 'colors.error.dark' },
  // blue / primary / info
  '#3b82f6': { token: 'colors.primary.main' },
  '#1976d2': { token: 'colors.primary.dark' },
  '#6366f1': { token: 'colors.secondary.dark' },
  '#8b5cf6': { token: 'colors.secondary.main' },
  // grey / text / border
  '#6b7280': { token: 'colors.grey.500' },
  '#e2e8f0': { token: 'colors.border.default' },
  // 其他高频
  '#0891b2': { token: 'colors.cyan.600' },
  '#ec4899': { token: 'colors.pink.main' },
  '#ffffff': { token: 'colors.background.paper' },
};

const SHORT_HEX_MAP = {
  '#fff': { token: 'colors.background.paper' },
  '#000': { token: 'colors.grey.950' },
};

// rgba → semanticTokens 近似规则（RGB 距离 ≤ 400 + alpha 区间命中）
const RGBA_RULES = [
  { r: 0, g: 0, b: 0, a: [0.35, 0.45], token: 'colors.cyber.glass.divider' },
  { r: 0, g: 0, b: 0, a: [0.08, 0.16], token: 'colors.cyber.glass.bgLight' },
  { r: 59, g: 130, b: 246, a: [0.12, 0.18], token: 'background.selectedDark' },
  { r: 16, g: 185, b: 129, a: [0.18, 0.22], token: 'colors.success.50' },
  // L0 高频: rgba(0,0,0,0.4) → 近似 divider/heavy
  { r: 0, g: 0, b: 0, a: [0.3, 0.5], token: 'colors.cyber.glass.divider' },
];

// ─── 工具函数 ───

function walk(dir, results) {
  results = results || [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full).replaceAll('\\', '/');
    if (IGNORED_PATH_PARTS.some((p) => rel.includes(p))) continue;
    if (THEME_FILE_RE.test(rel)) continue;
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (['.ts', '.tsx', '.css', '.scss'].includes(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function colorDistance(a, b) {
  const dr = a[0] - b[0],
    dg = a[1] - b[1],
    db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function parseRgba(expr) {
  const m = expr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)/);
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] === undefined ? 1 : Number(m[4]),
  };
}

/** 安全替换：只替换字符串引号中的完整色值 */
function safeReplace(content) {
  const replaced = [];
  const lines = content.split('\n');
  const outLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.includes('data:image')) {
      outLines.push(line);
      continue;
    }

    // 1. HEX 6-digit in quotes
    line = line.replace(/(['"`])((?:#)[0-9a-fA-F]{6})\1/g, (m, q, hex) => {
      const key = hex.toLowerCase();
      if (HEX_MAP[key]) {
        const token = HEX_MAP[key].token;
        replaced.push({ line: i + 1, rule: 'hex-6', from: hex, to: token });
        return q + token + q;
      }
      return m;
    });

    // 2. SHORT HEX (3-digit) in quotes
    line = line.replace(/(['"`])(#[0-9a-fA-F]{3})\1/g, (m, q, hex) => {
      const key = hex.toLowerCase();
      if (SHORT_HEX_MAP[key]) {
        const token = SHORT_HEX_MAP[key].token;
        replaced.push({ line: i + 1, rule: 'hex-3', from: hex, to: token });
        return q + token + q;
      }
      return m;
    });

    // 3. rgba() / rgb() in quotes
    line = line.replace(/(['"`])(rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[0-9.]+\s*)?\))\1/g, (m, q, rgbaExpr) => {
      const parsed = parseRgba(rgbaExpr);
      if (!parsed) return m;
      for (const rule of RGBA_RULES) {
        const aOk = parsed.a >= rule.a[0] && parsed.a <= rule.a[1];
        if (!aOk) continue;
        const dist = colorDistance([parsed.r, parsed.g, parsed.b], [rule.r, rule.g, rule.b]);
        if (dist <= 400) {
          replaced.push({ line: i + 1, rule: 'rgba-approx', from: rgbaExpr, to: rule.token });
          return q + rule.token + q;
        }
      }
      return m;
    });

    outLines.push(line);
  }

  return { newContent: outLines.join('\n'), replaced };
}

// ─── 入口 ───

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const reportOnly = args.includes('--report');

const files = walk(SRC);
console.log('Scanning ' + files.length + ' files under apps/web/src ...\n');

let totalReplaced = 0;
const byRule = {};
const byFile = {};
const samples = [];
let changedFiles = 0;

for (const file of files) {
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  const original = readFileSync(file, 'utf-8');
  const { newContent, replaced } = safeReplace(original);
  if (replaced.length === 0) continue;

  for (const r of replaced) {
    totalReplaced++;
    byRule[r.rule] = (byRule[r.rule] || 0) + 1;
  }
  byFile[rel] = replaced.length;
  changedFiles++;

  for (const r of replaced.slice(0, 2)) {
    if (samples.length < 50) samples.push({ file: rel, line: r.line, from: r.from, to: r.to, rule: r.rule });
  }

  if (apply && !reportOnly && newContent !== original) {
    writeFileSync(file, newContent, 'utf-8');
  }
}

const sortedFiles = Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

console.log('========================================');
console.log('V212-C2 Design Token 批量替换 · Summary');
console.log('========================================');
console.log('Mode: ' + (reportOnly ? 'REPORT (no-op)' : apply ? 'APPLY (writing)' : 'DRY-RUN'));
console.log('Scanned files: ' + files.length);
console.log('Files hit: ' + changedFiles);
console.log('Total replacements: ' + totalReplaced);
console.log('\nBy rule:');
for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
  console.log('- ' + rule + ': ' + n);
}
console.log('\nTop 20 files:');
for (const [f, n] of sortedFiles) {
  console.log('  ' + String(n).padStart(4) + ' × ' + f);
}
if (samples.length > 0) {
  console.log('\nSamples:');
  for (const s of samples.slice(0, 20)) {
    console.log('  ' + s.file + ':' + s.line + ' [' + s.rule + '] ' + s.from + '  →  ' + s.to);
  }
}

const summary = {
  generated_at: new Date().toISOString(),
  mode: reportOnly ? 'report' : apply ? 'apply' : 'dry-run',
  scanned_files: files.length,
  changed_files: changedFiles,
  total_replaced: totalReplaced,
  by_rule: byRule,
  top_20_files: sortedFiles.map(([f, n]) => ({ file: f, replacements: n })),
  samples,
};
writeFileSync(join(REPORT_DIR, 'fix-design-tokens-batch-summary.json'), JSON.stringify(summary, null, 2));

if (!apply || reportOnly) {
  console.log('\nℹ️  要真正写入文件，请追加 --apply 运行。');
  console.log('   JSON: docs/audit/fix-design-tokens-batch-summary.json');
} else {
  console.log('\n✅ 写入完成。JSON: docs/audit/fix-design-tokens-batch-summary.json');
}
