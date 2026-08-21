#!/usr/bin/env node
'use strict';

/* ========================================================================
 *  check-design-tokens.cjs — CI Token 合规扫描脚本
 *
 *  扫描目标：apps/web/src 和 packages/shared-components/src 中的
 *  硬编码颜色、间距、字号、阴影等设计值。
 *
 *  使用方式：
 *    node scripts/ci/check-design-tokens.cjs
 *    node scripts/ci/check-design-tokens.cjs --strict
 *    node scripts/ci/check-design-tokens.cjs --changed-only    # 仅扫描 git 变更文件
 *    node scripts/ci/check-design-tokens.cjs --json            # JSON 输出
 *    node scripts/ci/check-design-tokens.cjs --max-findings=20
 *
 *  退出码：
 *    0 — 无偏差（或非 strict 模式）
 *    1 — strict 模式下发现偏差
 *    2 — 执行异常
 * ======================================================================== */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SCAN_ROOTS = ['apps/web/src', 'packages/shared-components/src'];
const ALLOWED_FILES = new Set([
  'apps/web/src/theme/index.ts',
  'apps/web/src/theme/palette.ts',
  'apps/web/src/theme/tokens.ts',
  'apps/web/src/theme/design-tokens.ts',
]);

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
  '/theme/tokens/',
  '/design-system/tokens/',
  '/theme/generated-tokens',
  '/theme/gradients.',
  '/theme/presets.',
  '/theme/theme.',
];

const PATTERNS = [
  {
    id: 'hardcoded-color',
    description: '硬编码颜色，优先使用 theme.palette 或 design tokens',
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
    id: 'hardcoded-rem-font',
    description: '硬编码 rem 字号，优先使用 theme.typography 或设计 Token',
    regex: /\bfontSize\s*:\s*['"]?\d+\.?\d*rem['"]?/g,
  },
  {
    id: 'box-shadow',
    description: '硬编码阴影，优先使用 theme.shadows 或设计系统 shadow token',
    regex: /boxShadow\s*:\s*['"][^'"]*(?:rgba|#|\d+px)[^'"]*['"]/g,
  },
];

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const changedOnly = args.includes('--changed-only');
const jsonMode = args.includes('--json');
const maxFindings = Number(args.find((a) => a.startsWith('--max-findings='))?.split('=')[1] ?? 80);

function getGitChangedFiles() {
  try {
    const output = execSync('git diff --name-only --diff-filter=ACM origin/main...HEAD', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return output
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  } catch {
    return [];
  }
}

function isAllowedFile(relativePath) {
  return ALLOWED_FILES.has(relativePath);
}

function shouldIgnore(relativePath) {
  const normalized = `/${relativePath.replaceAll(path.sep, '/')}`;
  return IGNORED_PATH_PARTS.some((part) => normalized.includes(part));
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT, absolutePath).replaceAll(path.sep, '/');

    if (shouldIgnore(relativePath)) continue;

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
  const relativePath = path.relative(ROOT, filePath).replaceAll(path.sep, '/');
  if (isAllowedFile(relativePath)) return [];

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

    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      const matches = [...trimmed.matchAll(pattern.regex)];
      matches.forEach((match) => {
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

function main() {
  let files = [];

  if (changedOnly) {
    const changedFiles = getGitChangedFiles();
    files = changedFiles
      .filter((f) => SCAN_ROOTS.some((root) => f.startsWith(root)))
      .filter((f) => !shouldIgnore(f))
      .filter((f) => !isAllowedFile(f))
      .map((f) => path.join(ROOT, f))
      .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  } else {
    files = SCAN_ROOTS.flatMap((scanRoot) => walk(path.join(ROOT, scanRoot)));
  }

  const findings = files.flatMap(collectFindings);
  const grouped = findings.reduce((acc, finding) => {
    acc[finding.rule] = (acc[finding.rule] || 0) + 1;
    return acc;
  }, {});

  const result = {
    scannedFiles: files.length,
    scanScope: changedOnly ? 'changed-only' : 'full',
    totalFindings: findings.length,
    byRule: grouped,
    findings: findings.slice(0, maxFindings),
    hasMore: findings.length > maxFindings,
  };

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('========================================');
    console.log('Design Token 合规扫描（CI）');
    console.log('========================================');
    console.log(`扫描范围: ${result.scanScope}`);
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
  }

  if (strict && findings.length > 0) {
    if (!jsonMode) {
      console.error('\n❌ strict 模式失败：存在 Design Token 偏差。');
    }
    process.exit(1);
  }

  if (!jsonMode) {
    console.log('\n✅ 扫描完成');
  }
}

main();
