#!/usr/bin/env node
/**
 * 修复 sweep-phase3 产生的错误替换（误替换 common.white / common.black / WHITE / BLACK 常量 / 属性访问 .white/.black）
 * 还原所有非色值上下文的 white/black 替换
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../');
const TARGET_DIRS = [
  path.join(ROOT, 'apps/web/src'),
  path.join(ROOT, 'packages/shared-components/src'),
  path.join(ROOT, 'packages/shared-components'),
];
const EXEMPT = [/__tests__/, /\.stories\./, /\.d\.ts$/, /node_modules/, /generated-tokens\.css$/, /dist\//];
const args = process.argv.slice(2);
const apply = args.includes('--apply');

function walkDir(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(fp, out);
    else if (/\.(ts|tsx|css)$/i.test(fp) && !EXEMPT.some(p => p.test(path.relative(ROOT, fp)))) out.push(fp);
  }
  return out;
}

const REPLACEMENTS = [
  [/\bcommon\.var\(--color-primary-foreground, #ffffff\)/g, 'common.white'],
  [/\bcommon\.var\(--color-text-primary, #1e293b\)/g, 'common.black'],
  [/colors\.common\.var\(--color-text-primary, #1e293b\)/g, 'colors.common.black'],
  [/colors\.common\.var\(--color-primary-foreground, #ffffff\)/g, 'colors.common.white'],
  [/palette\.common\.var\(--color-primary-foreground,\s*#ffffff\)/g, 'palette.common.white'],
  [/palette\.common\.var\(--color-text-primary,\s*#1e293b\)/g, 'palette.common.black'],
  [/designTokens\.colors\.common\.var\(--color-text-primary, #1e293b\)/g, 'designTokens.colors.common.black'],
  [/designTokens\.colors\.common\.var\(--color-primary-foreground, #ffffff\)([0-9a-fA-F]{3})/g, (_, tail) => {
    const orig = '#ffffff' + tail;
    return `'var(--color-surface, ${orig})'`;
  }],
  [/designTokens\.colors\.common\.var\(--color-primary-foreground, #ffffff\)/g, 'designTokens.colors.common.white'],
  [/\bvar\(--color\s*-\s*primary\s*-\s*foreground,\s*#ffffff\)([0-9a-fA-F]{3})/g, (_, tail) => `var(--color-surface, #ffffff${tail})`],
  [/designTokens\.colors\.common\.var\(--color - primary - foreground, #ffffff\)([0-9a-fA-F]+)/g, (_, tail) => `'var(--color-surface, #ffffff${tail})'`],
  [/designTokens\.colors\.common\.var\(--color - primary - foreground, #ffffff\)/g, 'designTokens.colors.common.white'],
  [/colors\.common\.var\(--color - primary - foreground, #ffffff\)/g, 'colors.common.white'],
  [/colors\.common\.var\(--color - primary - foreground, #ffffff\)/g, 'colors.common.white'],
  [/bgcolor:\s*designTokens\.colors\.common\.var\([^)]*\)/g, 'bgcolor: designTokens.colors.common.white'],
  [/contrastText:\s*'colors\.common\.var\(--color-text-primary, #1e293b\)'/g, "contrastText: 'colors.common.black'"],
];

function fixContent(src) {
  let s = src;
  let ch = 0;
  for (const [re, to] of REPLACEMENTS) {
    const before = s;
    s = s.replace(re, to);
    if (s !== before) ch += (before.match(re) || []).length;
  }
  return { result: s, changes: ch };
}

function main() {
  const files = [];
  for (const t of TARGET_DIRS) walkDir(t, files);
  let totalCh = 0, totalF = 0;
  for (const fp of files) {
    const src = fs.readFileSync(fp, 'utf8');
    const { result, changes } = fixContent(src);
    if (changes > 0) {
      totalCh += changes; totalF++;
      if (apply) fs.writeFileSync(fp, result, 'utf8');
    }
  }
  console.log(`fixed ${totalCh} bad replacements in ${totalF} files (${apply ? 'APPLIED' : 'dry-run'})`);
}
main();
