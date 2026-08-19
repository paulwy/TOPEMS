#!/usr/bin/env node
/**
 * scripts/check-backbutton-backhref.mjs
 * =============================================================
 * 导航架构 §15.2 L555 合规检查器：Detail/Form 模板返回按钮兜底
 * 规范：
 *   所有 <DetailPageTemplate 和 <FormPageTemplate JSX 调用
 *   必须包含 backHref=... 属性，防止只靠 history.back() 作为唯一来源
 *
 * V1.0 / 2026-08-09
 * ============================================================= */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const PAGES_ROOT = resolve(REPO_ROOT, 'apps/web/src/pages');
const MODULES_ROOT = resolve(REPO_ROOT, 'apps/web/src/modules');
const COMPONENTS_ROOT = resolve(REPO_ROOT, 'apps/web/src/components');

const COMPONENT_DEFINITION_FILES = new Set([
  'apps/web/src/components/templates/DetailPageTemplate.tsx',
  'apps/web/src/components/templates/FormPageTemplate.tsx',
]);

const TARGET_COMPONENTS = ['DetailPageTemplate', 'FormPageTemplate'];

function globTsx(rootDir) {
  if (!existsSync(rootDir)) return [];
  return execSync(`find '${rootDir}' -type f \\( -name '*.tsx' -o -name '*.ts' \\) -print0`, { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

function findJsxOpeningTag(src, componentName, fromIndex = 0) {
  const pattern = new RegExp(`<${componentName}\\b`, 'g');
  pattern.lastIndex = fromIndex;
  return pattern.exec(src);
}

function extractJsxTagContent(src, openIndex) {
  const tagNameMatch = src.slice(openIndex).match(/^<([A-Za-z_][\w]*)/);
  if (!tagNameMatch) return null;
  const tagName = tagNameMatch[1];

  let i = openIndex + `<${tagName}`.length;
  let inStr = null,
    inTpl = false,
    braceDepth = 0;
  let propsStart = i;
  let selfClosing = false;
  let closeIndex = -1;

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (inStr) {
      if (c === inStr && src[i - 1] !== '\\') inStr = null;
      i++;
      continue;
    }
    if (inTpl) {
      if (c === '`' && src[i - 1] !== '\\') inTpl = false;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      i++;
      continue;
    }
    if (c === '`') {
      inTpl = true;
      i++;
      continue;
    }
    if (c === '{') {
      braceDepth++;
      i++;
      continue;
    }
    if (c === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      i++;
      continue;
    }

    if (braceDepth === 0 && c === '/' && next === '>') {
      selfClosing = true;
      closeIndex = i + 2;
      break;
    }
    if (braceDepth === 0 && c === '>') {
      closeIndex = i + 1;
      break;
    }
    i++;
  }

  if (closeIndex === -1) return null;

  const propsText = src.slice(propsStart, selfClosing ? closeIndex - 2 : closeIndex - 1);
  return {
    tagName,
    selfClosing,
    propsText: propsText.trim(),
    openIndex,
    closeIndex,
  };
}

function hasProp(propsText, propName) {
  const patterns = [
    new RegExp(`\\b${propName}\\s*=\\s*\\{`),
    new RegExp(`\\b${propName}\\s*=\\s*['"\`]`),
    new RegExp(`\\b${propName}\\s*=\\s*[A-Za-z_$]`),
  ];
  return patterns.some((p) => p.test(propsText));
}

function extractPageName(filePath, rel) {
  const base = filePath.split('/').pop() || filePath;
  const dirParts = rel.split('/');
  const modulePart = dirParts.find((p, i) => dirParts[i - 1] === 'pages' || dirParts[i - 1] === 'modules');
  return modulePart ? `${modulePart}/${base}` : base;
}

function scanFile(filePath) {
  const rel = filePath.replace(REPO_ROOT + '/', '');
  if (COMPONENT_DEFINITION_FILES.has(rel)) return [];
  if (rel.includes('__tests__')) return [];

  const src = readFileSync(filePath, 'utf8');
  const findings = [];

  for (const comp of TARGET_COMPONENTS) {
    let searchIdx = 0;
    let match;
    while ((match = findJsxOpeningTag(src, comp, searchIdx)) !== null) {
      const tagContent = extractJsxTagContent(src, match.index);
      const lineNum = src.slice(0, match.index).split('\n').length;

      if (tagContent) {
        const hasBackHref = hasProp(tagContent.propsText, 'backHref');
        findings.push({
          file: rel,
          component: comp,
          line: lineNum,
          pageName: extractPageName(filePath, rel),
          hasBackHref,
          propsPreview: tagContent.propsText.slice(0, 80) + (tagContent.propsText.length > 80 ? '...' : ''),
        });
      } else {
        findings.push({
          file: rel,
          component: comp,
          line: lineNum,
          pageName: extractPageName(filePath, rel),
          hasBackHref: false,
          propsPreview: '(JSX parse failed, manual check required)',
        });
      }

      searchIdx = match.index + 1;
    }
  }

  return findings;
}

async function selfTest() {
  const cyan = '\x1b[36m',
    green = '\x1b[32m',
    yellow = '\x1b[33m',
    red = '\x1b[31m',
    reset = '\x1b[0m';
  console.log(`${cyan}===== 导航架构 §15.2 L555：Detail/Form 模板 backHref 兜底检查 =====${reset}`);

  const scanRoots = [PAGES_ROOT, MODULES_ROOT, COMPONENTS_ROOT];
  const files = scanRoots.flatMap(globTsx);
  console.log(`扫描范围：${scanRoots.length} 目录 · ${files.length} 文件\n`);

  const allFindings = [];
  for (const file of files) {
    allFindings.push(...scanFile(file));
  }

  const stat = {
    total: allFindings.length,
    detailCount: 0,
    formCount: 0,
    withBackHref: 0,
    missing: 0,
  };

  const missingList = [];

  for (const f of allFindings) {
    if (f.component === 'DetailPageTemplate') stat.detailCount++;
    if (f.component === 'FormPageTemplate') stat.formCount++;

    if (f.hasBackHref) {
      stat.withBackHref++;
      console.log(`  [${green}OK${reset}]  ${f.file}:${f.line}  <${f.component}> backHref=✓`);
    } else {
      stat.missing++;
      missingList.push(f);
      console.log(`  [${red}MISS${reset}] ${f.file}:${f.line}  <${f.component}> ❌ 缺少 backHref 属性`);
      console.log(`         页面：${f.pageName}`);
      console.log(`         Props预览：${f.propsPreview}`);
      console.log('');
    }
  }

  console.log(
    `\n${cyan}统计${reset}：调用总数=${stat.total}` +
      `（DetailPageTemplate=${stat.detailCount} + FormPageTemplate=${stat.formCount}）` +
      ` · 合规=${green}${stat.withBackHref}${reset}` +
      ` · 缺失=${red}${stat.missing}${reset}`
  );

  if (stat.total === 0) {
    console.log(`\n${yellow}⚠  未检测到任何 DetailPageTemplate / FormPageTemplate 调用，请确认扫描范围${reset}`);
    return 0;
  }

  if (stat.missing === 0) {
    console.log(`\n${green}✅ PASS：所有 DetailPageTemplate / FormPageTemplate 调用均显式传 backHref${reset}`);
    return 0;
  } else {
    console.log(`\n${red}❌ FAIL：${stat.missing} 处缺少 backHref 属性${reset}`);
    console.log(`\n  规范要求：<DetailPageTemplate> / <FormPageTemplate> 必须传 backHref='...'`);
    console.log(`  理由：防止用户从外部域直接进入详情页时，history.back() 跳出系统外部`);
    console.log(`\n  修正参考：navigation-architecture.md §15.2 L555\n`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selfTest().then((r) => process.exit(r));
}
