#!/usr/bin/env node
/**
 * scripts/check-ai-context-injection.mjs
 * =============================================================
 * 导航架构 §15.2 L554 合规检查器：AI 上下文注入
 * 规范：
 *   任何调用 navigate(AI_PATHS.root) 的地方（AI 模块内部除外），
 *   调用前必须写入 localStorage `ai-copilot-context`，
 *   内容含 {pathname, moduleCode, breadcrumbs[]}
 *
 * V1.0 / 2026-08-09
 * ============================================================= */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const SCAN_ROOTS = [
  resolve(REPO_ROOT, 'apps/web/src/pages'),
  resolve(REPO_ROOT, 'apps/web/src/modules'),
  resolve(REPO_ROOT, 'apps/web/src/components'),
  resolve(REPO_ROOT, 'apps/web/src/hooks'),
  resolve(REPO_ROOT, 'apps/web/src/layouts'),
];

const AI_MODULE_DIR = 'apps/web/src/pages/ai/';

function globTsx(rootDir) {
  if (!existsSync(rootDir)) return [];
  return execSync(`find '${rootDir}' -type f \\( -name '*.tsx' -o -name '*.ts' \\) -print0`, { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

function findAllNavigateCalls(files) {
  const results = [];

  for (const file of files) {
    const rel = file.replace(REPO_ROOT + '/', '');
    if (rel.includes('__tests__')) continue;

    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');

    const re = /navigate\s*\(\s*AI_PATHS\.root\s*\)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const lineNum = src.slice(0, m.index).split('\n').length;
      results.push({
        file: rel,
        line: lineNum,
        charIndex: m.index,
        isAiModule: rel.startsWith(AI_MODULE_DIR),
      });
    }
  }

  return results;
}

function checkContextInjection(filePath, lineNum, charIndex) {
  const fullPath = resolve(REPO_ROOT, filePath);
  const src = readFileSync(fullPath, 'utf8');
  const lines = src.split('\n');

  const contextStart = Math.max(0, lineNum - 25);
  const contextEnd = Math.min(lines.length, lineNum);
  const contextLines = lines.slice(contextStart, contextEnd);
  const contextText = contextLines.join('\n');

  const patterns = [
    /localStorage\.setItem\s*\(\s*['"`]ai-copilot-context['"`]/,
    /localStorage\s*\[\s*['"`]ai-copilot-context['"`]\s*\]\s*=/,
    /ai-copilot-context\s*.*localStorage/,
    /setAIContext|injectAIContext|writeAICopilotContext/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(contextText)) {
      const match = contextText.match(pattern);
      const matchLineInContext = contextText.slice(0, match.index).split('\n').length;
      const absoluteLine = contextStart + matchLineInContext;
      return { compliant: true, contextLine: absoluteLine, pattern: pattern.toString() };
    }
  }

  const snippet = lines
    .slice(Math.max(0, lineNum - 6), Math.min(lines.length, lineNum + 2))
    .map((l, idx) => `    ${String(lineNum - 5 + idx).padStart(4)}: ${l}`)
    .join('\n');

  return { compliant: false, snippet };
}

async function selfTest() {
  const cyan = '\x1b[36m',
    green = '\x1b[32m',
    yellow = '\x1b[33m',
    red = '\x1b[31m',
    reset = '\x1b[0m';
  console.log(`${cyan}===== 导航架构 §15.2 L554：AI 上下文注入检查 =====${reset}`);

  const files = SCAN_ROOTS.flatMap(globTsx);
  console.log(`扫描范围：${SCAN_ROOTS.length} 目录 · ${files.length} 文件`);
  console.log(`AI 模块豁免目录：${AI_MODULE_DIR}\n`);

  const calls = findAllNavigateCalls(files);

  const stat = {
    total: calls.length,
    exempted: 0,
    compliant: 0,
    violations: 0,
  };

  const violations = [];
  const exemptedList = [];
  const compliantList = [];

  for (const call of calls) {
    if (call.isAiModule) {
      stat.exempted++;
      exemptedList.push(call);
      console.log(`  [${yellow}EXEMPT${reset}] ${call.file}:${call.line}  AI 模块内部调用，豁免`);
      continue;
    }

    const result = checkContextInjection(call.file, call.line, call.charIndex);
    if (result.compliant) {
      stat.compliant++;
      compliantList.push({ ...call, ...result });
      console.log(
        `  [${green}OK${reset}]  ${call.file}:${call.line}  上下文注入：L${result.contextLine} (${result.pattern.slice(0, 40)}...)`
      );
    } else {
      stat.violations++;
      violations.push({ ...call, ...result });
      console.log(`  [${red}MISS${reset}] ${call.file}:${call.line}  ❌ 调用前未检测到 ai-copilot-context 注入`);
      console.log(result.snippet);
      console.log('');
    }
  }

  console.log(
    `\n${cyan}统计${reset}：调用点总数=${stat.total}` +
      ` · 豁免=${yellow}${stat.exempted}${reset}` +
      ` · 合规=${green}${stat.compliant}${reset}` +
      ` · 违规=${red}${stat.violations}${reset}`
  );

  if (stat.violations === 0) {
    if (stat.total === 0) {
      console.log(`\n${yellow}⚠  未检测到任何 navigate(AI_PATHS.root) 调用点，请确认正则覆盖${reset}`);
    } else {
      console.log(`\n${green}✅ PASS：所有非 AI 模块 navigate(AI_PATHS.root) 调用前均已注入上下文${reset}`);
    }
    return 0;
  } else {
    console.log(`\n${red}❌ FAIL：${stat.violations} 处缺少 ai-copilot-context 注入${reset}`);
    console.log(`\n  规范要求：调用 navigate(AI_PATHS.root) 前必须：`);
    console.log(`    localStorage.setItem('ai-copilot-context', JSON.stringify({`);
    console.log(`      pathname, moduleCode, breadcrumbs: [...]`);
    console.log(`    }))`);
    console.log(`\n  修正参考：navigation-architecture.md §15.2 L554\n`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selfTest().then((r) => process.exit(r));
}
