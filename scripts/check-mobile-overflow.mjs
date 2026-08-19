#!/usr/bin/env node
/**
 * scripts/check-mobile-overflow.mjs
 * =============================================================
 * 导航架构 §15.2 L553 合规检查器：移动端 actions 溢出处理
 * 规范：
 *   (1) PageHeader / ListPageTemplate actions 长度 > 2 时，
 *       isMobile 分支必须使用 actions.slice(0, 2) + MoreHorizontal 溢出菜单
 *   (2) color: error 的按钮不得出现在 slice(0, 2) 的前 2 位
 *
 * V1.0 / 2026-08-09
 * ============================================================= */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const PAGE_HEADER_FILE = resolve(REPO_ROOT, 'apps/web/src/components/templates/PageHeader.tsx');
const LIST_PAGE_TEMPLATE_FILE = resolve(REPO_ROOT, 'apps/web/src/components/templates/ListPageTemplate.tsx');
const PAGES_ROOT = resolve(REPO_ROOT, 'apps/web/src/pages');
const MODULES_ROOT = resolve(REPO_ROOT, 'apps/web/src/modules');

function globTsx(rootDir) {
  if (!existsSync(rootDir)) return [];
  return execSync(`find '${rootDir}' -type f \\( -name '*.tsx' -o -name '*.ts' \\) -print0`, { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

function findMatchingClose(src, openPos, open = '[') {
  const close = open === '[' ? ']' : '}';
  let i = openPos + 1,
    depth = 1,
    inStr = null,
    inTpl = false;
  while (i < src.length) {
    const c = src[i];
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
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function splitTopLevelCommas(text) {
  const items = [];
  let buf = '',
    depth = 0,
    inStr = null,
    inTpl = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      buf += c;
      if (c === inStr && text[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (inTpl) {
      buf += c;
      if (c === '`' && text[i - 1] !== '\\') inTpl = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      buf += c;
      continue;
    }
    if (c === '`') {
      inTpl = true;
      buf += c;
      continue;
    }
    if (c === '[' || c === '{') (depth++, (buf += c));
    else if (c === ']' || c === '}') ((depth = Math.max(0, depth - 1)), (buf += c));
    else if (c === ',' && depth === 0) {
      items.push(buf.trim());
      buf = '';
    } else buf += c;
  }
  if (buf.trim()) items.push(buf.trim());
  return items;
}

function extractProps(objText) {
  const out = {};
  for (const key of ['variant', 'color', 'icon', 'label']) {
    const re = new RegExp(`${key}\\s*[:=]\\s*(['"\`])([^'"\`]+)\\1`, 'i');
    const m = objText.match(re);
    if (m) out[key] = m[2];
  }
  return out;
}

function extractAllActionsBlocks(tsx) {
  const blocks = [];
  const re = /\bactions\s*=\s*\{/g;
  let m;
  while ((m = re.exec(tsx)) !== null) {
    const braceOpen = tsx.indexOf('{', m.index);
    const braceClose = findMatchingClose(tsx, braceOpen, '{');
    if (braceClose === -1) continue;
    const inside = tsx.slice(braceOpen + 1, braceClose).trim();
    const line = tsx.slice(0, m.index).split('\n').length;
    if (inside.startsWith('[')) {
      blocks.push({ kind: 'inline', text: inside, line });
    } else if (/^[A-Za-z_$][\w$]*$/.test(inside)) {
      blocks.push({ kind: 'var', varName: inside, line, text: null });
    }
  }
  return blocks;
}

function resolveVarArray(tsx, varName) {
  const re = new RegExp(`\\b(?:const|let)\\s+${varName}\\b[^=]*=\\s*\\[`, 's');
  const m = tsx.match(re);
  if (!m) return null;
  const bracketStart = tsx.indexOf('[', m.index);
  const bracketClose = findMatchingClose(tsx, bracketStart, '[');
  if (bracketClose === -1) return null;
  return tsx.slice(bracketStart, bracketClose + 1);
}

function checkTemplateFile(filePath, label) {
  const errors = [];
  const warnings = [];
  const notices = [];

  if (!existsSync(filePath)) {
    errors.push(`${label} 文件不存在：${filePath}`);
    return { errors, warnings, notices };
  }

  const src = readFileSync(filePath, 'utf8');
  const rel = filePath.replace(REPO_ROOT + '/', '');

  const slicePattern = /isMobile\s*\?\s*actions\.slice\(\s*0\s*,\s*2\s*\)\s*:\s*actions/;
  const sliceMatch = src.match(slicePattern);

  if (sliceMatch) {
    notices.push(`${label}: 检测到合规的 slice(0, 2) 模式`);
  } else {
    errors.push(`${label}: 未找到 isMobile 分支的 actions.slice(0, 2) 合规模式`);
  }

  const moreHorizontalPattern = /MoreHorizontal/;
  if (moreHorizontalPattern.test(src)) {
    notices.push(`${label}: 检测到 MoreHorizontal 溢出图标引用`);
  } else {
    errors.push(`${label}: 未找到 MoreHorizontal 溢出图标引用`);
  }

  const hiddenActionsPattern = /hiddenActions\s*=\s*isMobile\s*\?\s*actions\.slice\(\s*2\s*\)\s*:\s*\[\]/;
  if (hiddenActionsPattern.test(src)) {
    notices.push(`${label}: 检测到 hiddenActions.slice(2) 合规模式`);
  } else {
    warnings.push(`${label}: 建议验证 hiddenActions 分支是否正确使用 actions.slice(2)`);
  }

  return { errors, warnings, notices, file: rel };
}

function findCustomPageHeaderActions() {
  const warnings = [];
  const files = [...globTsx(PAGES_ROOT), ...globTsx(MODULES_ROOT)];

  const templateFiles = new Set([
    'apps/web/src/components/templates/PageHeader.tsx',
    'apps/web/src/components/templates/ListPageTemplate.tsx',
    'apps/web/src/components/templates/list/PageHeader.tsx',
    'apps/web/src/pages/bi/GisPage/components/PageHeader.tsx',
  ]);

  for (const file of files) {
    const rel = file.replace(REPO_ROOT + '/', '');
    if (templateFiles.has(rel)) continue;
    if (rel.includes('__tests__')) continue;

    const src = readFileSync(file, 'utf8');
    if (/\bPageHeader\b/.test(src) && /\bisMobile\b/.test(src) && /\bactions\b/.test(src)) {
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/\bisMobile.*actions|actions.*isMobile/.test(lines[i])) {
          const sliceStart = Math.max(0, i - 2);
          const sliceEnd = Math.min(lines.length, i + 3);
          const snippet = lines
            .slice(sliceStart, sliceEnd)
            .map((l, idx) => `${sliceStart + idx + 1}: ${l}`)
            .join('\n');
          warnings.push({
            file: rel,
            line: i + 1,
            msg: `检测到自定义 PageHeader + isMobile + actions 处理，建议确认移动端溢出策略（slice(0,2) + MoreHorizontal）`,
            snippet,
          });
          break;
        }
      }
    }
  }
  return warnings;
}

function checkPageLevelActionsErrorPosition() {
  const errors = [];
  const files = [...globTsx(PAGES_ROOT), ...globTsx(MODULES_ROOT)];

  for (const file of files) {
    const rel = file.replace(REPO_ROOT + '/', '');
    if (rel.includes('__tests__')) continue;

    const tsx = readFileSync(file, 'utf8');
    const blocks = extractAllActionsBlocks(tsx);

    for (const blk of blocks) {
      let arrText = blk.text;
      if (blk.kind === 'var') {
        const res = resolveVarArray(tsx, blk.varName);
        if (res) arrText = res;
        else continue;
      }
      if (!arrText || arrText[0] !== '[') continue;

      if (arrText[0] !== '[') {
        const bs = arrText.indexOf('[');
        if (bs === -1) continue;
        const be = findMatchingClose(arrText, bs, '[');
        if (be === -1) continue;
        arrText = arrText.slice(bs, be + 1);
      }

      const items = splitTopLevelCommas(arrText.slice(1, -1));
      if (items.length <= 2) continue;

      const firstTwo = items.slice(0, 2);
      for (let idx = 0; idx < firstTwo.length; idx++) {
        const props = extractProps(firstTwo[idx]);
        if (props.color === 'error') {
          errors.push({
            file: rel,
            line: blk.line,
            msg: `color=error 按钮出现在 slice(0,2) 的第 ${idx + 1} 位，违反移动端溢出规范 §15.2`,
            detail: props.label || props.icon || '(unnamed action)',
          });
        }
      }
    }
  }
  return errors;
}

async function selfTest() {
  const cyan = '\x1b[36m',
    green = '\x1b[32m',
    yellow = '\x1b[33m',
    red = '\x1b[31m',
    reset = '\x1b[0m';
  console.log(`${cyan}===== 导航架构 §15.2 L553：移动端 actions 溢出检查 =====${reset}`);

  const stat = {
    templateChecks: 0,
    templatePass: 0,
    customWarnings: 0,
    positionErrors: 0,
    totalErrors: 0,
  };

  const allIssues = [];

  const templateFiles = [
    { path: PAGE_HEADER_FILE, label: 'PageHeader.tsx' },
    { path: LIST_PAGE_TEMPLATE_FILE, label: 'ListPageTemplate.tsx' },
  ];

  for (const tpl of templateFiles) {
    stat.templateChecks++;
    const result = checkTemplateFile(tpl.path, tpl.label);

    for (const n of result.notices || []) {
      console.log(`  ${green}✓ ${n}${reset}`);
    }
    for (const w of result.warnings || []) {
      stat.customWarnings++;
      console.log(`  [${yellow}WARN${reset}] ${w}`);
    }
    for (const e of result.errors || []) {
      stat.totalErrors++;
      console.log(`  [${red}FAIL${reset}] ${e}`);
      allIssues.push({ type: 'template', msg: e });
    }

    if ((result.errors?.length || 0) === 0) stat.templatePass++;
  }

  console.log(`\n${cyan}--- 页面级自定义 isMobile/actions 处理扫描 ---${reset}`);
  const customWarnings = findCustomPageHeaderActions();
  stat.customWarnings = customWarnings.length;
  for (const w of customWarnings) {
    console.log(`  [${yellow}WARN${reset}] ${w.file}:${w.line}  ${w.msg}`);
  }
  if (customWarnings.length === 0) {
    console.log(`  ${green}✓ 未发现自定义 PageHeader 移动端 actions 处理${reset}`);
  }

  console.log(`\n${cyan}--- color=error 按钮位置（slice(0,2) 前 2 位）检查 ---${reset}`);
  const positionErrors = checkPageLevelActionsErrorPosition();
  stat.positionErrors = positionErrors.length;
  stat.totalErrors += positionErrors.length;
  for (const e of positionErrors) {
    console.log(`  [${red}ERR${reset}] ${e.file}:${e.line}  ${e.msg}  [${e.detail}]`);
    allIssues.push({ type: 'position', ...e });
  }
  if (positionErrors.length === 0) {
    console.log(`  ${green}✓ 所有 actions 数组的前 2 位未发现 color=error 按钮${reset}`);
  }

  console.log(
    `\n${cyan}统计${reset}：模板=${stat.templatePass}/${stat.templateChecks} 通过` +
      ` · 自定义告警=${yellow}${stat.customWarnings}${reset}` +
      ` · 位置违规=${red}${stat.positionErrors}${reset}`
  );

  if (stat.totalErrors === 0) {
    console.log(`\n${green}✅ PASS：移动端 actions 溢出处理合规${reset}`);
    if (stat.customWarnings > 0) {
      console.log(`${yellow}⚠  ${stat.customWarnings} 条自定义处理告警（建议人工确认）${reset}`);
    }
    return 0;
  } else {
    console.log(`\n${red}❌ FAIL：${stat.totalErrors} 处违规${reset}`);
    console.log(`\n  修正参考：navigation-architecture.md §15.2 L553\n`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selfTest().then((r) => process.exit(r));
}
