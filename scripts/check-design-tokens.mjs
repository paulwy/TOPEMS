#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const scanRoots = ['apps/web/src'];
const strict = process.argv.includes('--strict');
const maxFindings = Number(process.argv.find((arg) => arg.startsWith('--max-findings='))?.split('=')[1] ?? 80);

const ignoredPathParts = [
  '/node_modules/',
  '/dist/',
  '/build/',
  '/coverage/',
  '/test-results/',
  '/playwright-report/',
  '/theme/animations/',
  '/__tests__/',
  '.stories.',
  // V215: Token 定义文件是 design token 的源头，不计为偏差
  '/theme/tokens/',
  '/design-system/tokens/',
  '/theme/generated-tokens',
  '/theme/gradients.',
  '/theme/presets.',
  '/theme/theme.',
  // redesign 体系令牌定义源（V215 同规：定义层不计偏差）
  '/theme/redesign-tokens.css',
  '/theme/redesign-global.css',
  // GIS 热力色带：canvas 动态 alpha 数据可视化色带（功能映射非主题色）
  '/components/gis/',
];

const allowedFiles = new Set([
  'apps/web/src/theme/index.ts',
  'apps/web/src/theme/palette.ts',
  'apps/web/src/theme/tokens.ts',
]);

const patterns = [
  {
    id: 'hardcoded-color',
    description: '硬编码颜色，优先使用 theme.palette 或 packages/tokens',
    regex: /(?<![\w-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/g,
  },
  {
    id: 'rgb-color',
    description: '硬编码 rgb/rgba 颜色，优先使用 theme.palette 或 alpha(theme.palette.*)',
    regex: /\brgba?\([^)]+\)/g,
  },
  {
    id: 'fixed-px-spacing',
    description: '固定 px 间距，优先使用 MUI spacing 数字或 theme.spacing',
    regex:
      /(?:\bp\b|\bpx\b|\bpy\b|\bpt\b|\bpr\b|\bpb\b|\bpl\b|\bm\b|\bmx\b|\bmy\b|\bmt\b|\bmr\b|\bmb\b|\bml\b|\bgap\b|\browGap\b|\bcolumnGap\b)\s*:\s*['"]?\d+px['"]?/g,
  },
  {
    id: 'box-shadow',
    description: '硬编码阴影，优先使用 theme.shadows 或设计系统 shadow token',
    regex: /boxShadow\s*:\s*['"][^'"]*(?:rgba|#|\d+px)[^'"]*['"]/g,
  },
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, absolutePath);
    const normalized = `/${relativePath.replaceAll(path.sep, '/')}`;

    if (ignoredPathParts.some((part) => normalized.includes(part))) continue;

    if (entry.isDirectory()) {
      files.push(...walk(absolutePath));
      continue;
    }

    if (/\.(ts|tsx|css|scss)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function collectFindings(filePath) {
  const relativePath = path.relative(rootDir, filePath).replaceAll(path.sep, '/');
  if (allowedFiles.has(relativePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const findings = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.includes('data:image/svg+xml') ||
      trimmed.includes('eslint-disable')
    ) {
      return;
    }

    // CSS var(--token, fallback) 兜底：已引用 token，fallback 仅为变量未定义时兜底，
    // 其中出现的颜色/阴影不算硬编码（真实值维护在 generated-tokens.css）
    const varFallbackRanges = [];
    const varRe = /var\(\s*--[\w-]+\s*,/g;
    let varMatch;
    while ((varMatch = varRe.exec(trimmed)) !== null) {
      const start = varRe.lastIndex;
      const end = trimmed.indexOf(')', start);
      if (end !== -1) varFallbackRanges.push([start, end]);
    }
    const inVarFallback = (pos) =>
      varFallbackRanges.some(([s, e]) => pos >= s && pos < e);

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      const matches = [...trimmed.matchAll(pattern.regex)];
      matches.forEach((match) => {
        // HTML 实体（&#NNN; 如 &#039;）非颜色，跳过（匹配串可能是 #039，需看前置 &）
        if (trimmed[match.index - 1] === '&') return;
        // 值本身已引用 var(--token)（如 boxShadow: '...var(--border-default)'），非硬编码
        if (pattern.id !== 'fixed-px-spacing' && match[0].includes('var(--')) return;
        if (pattern.id !== 'fixed-px-spacing' && inVarFallback(match.index)) return;
        findings.push({
          file: relativePath,
          line: index + 1,
          rule: pattern.id,
          message: pattern.description,
          sample: match[0],
        });
      });
    }
  });

  return findings;
}

const files = scanRoots.flatMap((scanRoot) => walk(path.join(rootDir, scanRoot)));
const findings = files.flatMap(collectFindings);
const grouped = findings.reduce((acc, finding) => {
  acc[finding.rule] = (acc[finding.rule] || 0) + 1;
  return acc;
}, {});

console.log('========================================');
console.log('Design Token 自动化扫描');
console.log('========================================');
console.log(`扫描文件数: ${files.length}`);
console.log(`发现偏差数: ${findings.length}`);
Object.entries(grouped).forEach(([rule, count]) => {
  console.log(`- ${rule}: ${count}`);
});

if (findings.length > 0) {
  console.log('\nTop findings:');
  findings.slice(0, maxFindings).forEach((finding) => {
    console.log(`${finding.file}:${finding.line} [${finding.rule}] ${finding.sample} - ${finding.message}`);
  });
  if (findings.length > maxFindings) {
    console.log(`... 还有 ${findings.length - maxFindings} 条，使用 --max-findings=N 查看更多。`);
  }
}

if (strict && findings.length > 0) {
  console.error('\n❌ strict 模式失败：存在 Design Token 偏差。');
  process.exit(1);
}

console.log('\n✅ 扫描完成');
