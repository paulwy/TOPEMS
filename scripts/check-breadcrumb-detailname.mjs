#!/usr/bin/env node
/**
 * scripts/check-breadcrumb-detailname.mjs
 * =============================================================
 * 导航架构 §15.2 L556 合规检查器：详情页面包屑末端替换
 * 规范：
 *   所有 detail 页面（使用 DetailPageTemplate 的页面），
 *   必须向 DetailPageTemplate 传 detailItemName 属性，
 *   将面包屑末端的"详情"替换为实际对象名（如员工姓名、订单号）
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
]);

function globTsx(rootDir) {
  if (!existsSync(rootDir)) return [];
  return execSync(`find '${rootDir}' -type f \\( -name '*.tsx' -o -name '*.ts' \\) -print0`,
    { encoding: 'utf8' }).split('\0').filter(Boolean);
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
  let inStr = null, inTpl = false, braceDepth = 0;
  let propsStart = i;
  let selfClosing = false;
  let closeIndex = -1;

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (inStr) {
      if (c === inStr && src[i - 1] !== '\\') inStr = null;
      i++; continue;
    }
    if (inTpl) {
      if (c === '`' && src[i - 1] !== '\\') inTpl = false;
      i++; continue;
    }
    if (c === '"' || c === "'") { inStr = c; i++; continue; }
    if (c === '`') { inTpl = true; i++; continue; }
    if (c === '{') { braceDepth++; i++; continue; }
    if (c === '}') { braceDepth = Math.max(0, braceDepth - 1); i++; continue; }

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
  return patterns.some(p => p.test(propsText));
}

function extractPageName(filePath, rel) {
  const base = filePath.split('/').pop() || filePath;
  const dirParts = rel.split('/');
  const modulePart = dirParts.find((p, i) =>
    dirParts[i - 1] === 'pages' || dirParts[i - 1] === 'modules'
  );
  return modulePart ? `${modulePart}/${base}` : base;
}

function scanDetailTemplateCalls(filePath) {
  const rel = filePath.replace(REPO_ROOT + '/', '');
  if (COMPONENT_DEFINITION_FILES.has(rel)) return [];
  if (rel.includes('__tests__')) return [];

  const src = readFileSync(filePath, 'utf8');
  const findings = [];

  let searchIdx = 0;
  let match;
  while ((match = findJsxOpeningTag(src, 'DetailPageTemplate', searchIdx)) !== null) {
    const tagContent = extractJsxTagContent(src, match.index);
    const lineNum = src.slice(0, match.index).split('\n').length;

    if (tagContent) {
      const hasDetailItemName = hasProp(tagContent.propsText, 'detailItemName');
      findings.push({
        file: rel,
        line: lineNum,
        pageName: extractPageName(filePath, rel),
        hasDetailItemName,
        propsPreview: tagContent.propsText.slice(0, 100) + (tagContent.propsText.length > 100 ? '...' : ''),
      });
    } else {
      findings.push({
        file: rel,
        line: lineNum,
        pageName: extractPageName(filePath, rel),
        hasDetailItemName: false,
        propsPreview: '(JSX parse failed, manual check required)',
      });
    }

    searchIdx = match.index + 1;
  }

  return findings;
}

function scanStandalonePageHeaderCalls(filePath) {
  const rel = filePath.replace(REPO_ROOT + '/', '');
  if (rel.includes('__tests__')) return [];

  const src = readFileSync(filePath, 'utf8');
  if (!/\bDetailPageTemplate\b/.test(src)) return [];

  const findings = [];

  let searchIdx = 0;
  let match;
  while ((match = findJsxOpeningTag(src, 'PageHeader', searchIdx)) !== null) {
    const tagContent = extractJsxTagContent(src, match.index);
    if (!tagContent) {
      searchIdx = match.index + 1;
      continue;
    }
    if (!hasProp(tagContent.propsText, 'detailItemName')) {
      const lineNum = src.slice(0, match.index).split('\n').length;
      findings.push({
        file: rel,
        line: lineNum,
        note: '(同文件内 PageHeader 也缺少 detailItemName，DetailPageTemplate 会转发，可仅检查模板调用)',
      });
    }
    searchIdx = match.index + 1;
  }

  return findings;
}

async function selfTest() {
  const cyan = '\x1b[36m', green = '\x1b[32m', yellow = '\x1b[33m', red = '\x1b[31m', reset = '\x1b[0m';
  console.log(`${cyan}===== 导航架构 §15.2 L556：详情页 detailItemName 面包屑替换检查 =====${reset}`);

  const scanRoots = [PAGES_ROOT, MODULES_ROOT, COMPONENTS_ROOT];
  const files = scanRoots.flatMap(globTsx);
  console.log(`扫描范围：${scanRoots.length} 目录 · ${files.length} 文件\n`);

  const allDetailFindings = [];
  for (const file of files) {
    allDetailFindings.push(...scanDetailTemplateCalls(file));
  }

  const stat = {
    totalDetailPages: allDetailFindings.length,
    withDetailItemName: 0,
    missing: 0,
  };

  const missingList = [];

  for (const f of allDetailFindings) {
    if (f.hasDetailItemName) {
      stat.withDetailItemName++;
      console.log(`  [${green}OK${reset}]  ${f.file}:${f.line}  detailItemName=✓`);
    } else {
      stat.missing++;
      missingList.push(f);
      console.log(`  [${red}MISS${reset}] ${f.file}:${f.line}  ❌ 缺少 detailItemName 属性`);
      console.log(`         页面：${f.pageName}`);
      console.log(`         Props预览：${f.propsPreview}`);
      console.log('');
    }
  }

  console.log(
    `\n${cyan}统计${reset}：DetailPageTemplate 调用总数=${stat.totalDetailPages}`
    + ` · 合规=${green}${stat.withDetailItemName}${reset}`
    + ` · 缺失=${red}${stat.missing}${reset}`
  );

  if (stat.totalDetailPages === 0) {
    console.log(`\n${yellow}⚠  未检测到任何 DetailPageTemplate 调用，请确认扫描范围${reset}`);
    return 0;
  }

  if (stat.missing === 0) {
    console.log(`\n${green}✅ PASS：所有详情页均已传 detailItemName，面包屑末端将正确替换${reset}`);
    return 0;
  } else {
    console.log(`\n${red}❌ FAIL：${stat.missing} 处缺少 detailItemName 属性${reset}`);
    console.log(`\n  规范要求：<DetailPageTemplate> 必须传 detailItemName={对象名称}`);
    console.log(`  效果：面包屑末端 "详情" → 实际对象名（如员工姓名"张三"、工单号"WO-2026-001"）`);
    console.log(`  原理：DetailPageTemplate 会把 detailItemName 转发给 PageHeader，替换最后一级 pathTab 标签`);
    console.log(`\n  修正参考：navigation-architecture.md §15.2 L556\n`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selfTest().then(r => process.exit(r));
}
