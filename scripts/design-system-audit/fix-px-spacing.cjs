#!/usr/bin/env node
'use strict';

/**
 * 批量将可映射到 designTokens.spacing 的硬编码 px 值替换为 token 引用。
 *
 * 仅处理明确属于间距的属性（padding/margin/gap/position/lineHeight），
 * 并跳过 1px 边框、calc()、URL、尺寸类属性。
 *
 * 使用方式：
 *   node scripts/design-system-audit/fix-px-spacing.cjs
 *   node scripts/design-system-audit/fix-px-spacing.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCAN_ROOTS = ['apps/web/src', 'packages/shared-components/src'];
const SKIP_PATTERNS = [
  /\.css\.ts$/,
  /\.stories\.tsx$/,
  /\.test\.tsx$/,
  /[\/]design-system[\/]tokens[\/]/,
  /[\/]docs[\/]DesignTokens\.tsx$/,
  /[\/]theme[\/]tokens\.ts$/,
  /[\/]theme[\/]design-tokens\.ts$/,
  /[\/]theme[\/]dataGridTheme\.ts$/,
];

const PX_TO_TOKEN = {
  4: 'xs',
  8: 'sm',
  16: 'md',
  24: 'lg',
  32: 'xl',
  48: '2xl',
  64: '3xl',
};

const SPACING_PROPS = new Set([
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'paddingX', 'paddingY', 'p', 'pt', 'pb', 'pl', 'pr', 'px', 'py',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginX', 'marginY', 'm', 'mt', 'mb', 'ml', 'mr', 'mx', 'my',
  'gap', 'rowGap', 'columnGap',
  'top', 'right', 'bottom', 'left',
  'lineHeight',
]);

const DIMENSION_PROPS = new Set([
  'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 'flex', 'flexBasis',
]);

const PROP_REGEX = new RegExp(
  `\\b(${Array.from(SPACING_PROPS).join('|')})\\s*:\\s*(['"\`])([^'"\`]*)\\2`,
  'g'
);

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
  const direct = content.match(/import\s+\{[^}]*\bdesignTokens\b[^}]*\}\s+from\s+['"][^'"]*['"]/);
  if (direct) return 'designTokens';

  const aliasMatch = content.match(/import\s+\{[^}]*\bdesignTokens\s+as\s+(\w+)\b[^}]*\}\s+from\s+['"][^'"]*['"]/);
  if (aliasMatch) return aliasMatch[1];

  return null;
}

function isInCalc(stringBefore) {
  const calcStart = stringBefore.lastIndexOf('calc(');
  if (calcStart === -1) return false;
  const calcEnd = stringBefore.indexOf(')', calcStart);
  return calcEnd === -1;
}

function formatTokenAccess(alias, token) {
  // 2xl、3xl 等以数字开头的 key 必须使用 bracket notation
  if (/^\d/.test(token)) {
    return `${alias}.spacing['${token}']`;
  }
  return `${alias}.spacing.${token}`;
}

function replacePxInValue(value, alias) {
  return value.replace(/\b(\d+)px\b/g, (match, num) => {
    const token = PX_TO_TOKEN[num];
    if (!token) return match;
    return `\${${formatTokenAccess(alias, token)}}px`;
  });
}

function isInStyleContext(content, index) {
  // 向前查找最近的样式上下文起点（sx/style/css/styled）
  const before = content.slice(0, index);
  const lastSx = before.lastIndexOf('sx=');
  const lastStyle = before.lastIndexOf('style=');
  const lastCss = before.lastIndexOf('css=');
  const lastStyled = before.lastIndexOf('styled(');

  const styleContextStart = Math.max(lastSx, lastStyle, lastCss, lastStyled);
  if (styleContextStart === -1) return false;

  // 检查是否仍在对应的 { ... } 或 `...` 内
  const after = content.slice(styleContextStart, index);
  const openBraces = (after.match(/\{/g) || []).length;
  const closeBraces = (after.match(/\}/g) || []).length;
  const openBackticks = (after.match(/`/g) || []).length;

  if (styleContextStart === lastStyled) {
    // styled 使用模板字符串，未闭合的 ` 数量为奇数即仍在模板内
    return openBackticks % 2 === 1;
  }

  return openBraces > closeBraces;
}

function collectReplacements(content, alias) {
  const replacements = [];
  let match;
  PROP_REGEX.lastIndex = 0;
  while ((match = PROP_REGEX.exec(content)) !== null) {
    const [fullMatch, prop, quote, value] = match;
    if (DIMENSION_PROPS.has(prop)) continue;
    if (!isInStyleContext(content, match.index)) continue;

    const before = content.slice(0, match.index);
    if (isInCalc(before)) continue;

    const newValue = replacePxInValue(value, alias);
    if (newValue !== value) {
      replacements.push({
        index: match.index,
        length: fullMatch.length,
        prop,
        quote,
        newValue,
      });
    }
  }
  return replacements;
}

function processFile(filePath, dryRun) {
  const relative = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const alias = detectAlias(content);
  let replacements = collectReplacements(content, alias || 'designTokens');
  let needImport = false;

  if (replacements.length === 0) return false;

  if (!alias) {
    needImport = true;
    replacements = collectReplacements(content, 'designTokens');
    if (replacements.length === 0) return false;
  }

  // 从后往前替换，避免索引偏移
  let newContent = content;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { index, length, prop, quote, newValue } = replacements[i];
    // 如果替换后包含模板表达式，必须使用反引号
    const finalQuote = newValue.includes('${') ? '`' : quote;
    newContent =
      newContent.slice(0, index) +
      `${prop}: ${finalQuote}${newValue}${finalQuote}` +
      newContent.slice(index + length);
  }

  if (needImport && !detectAlias(newContent)) {
    const importLine = "import { designTokens } from '@topems/tokens';\n";
    newContent = importLine + newContent;
  }

  if (newContent !== original) {
    if (!dryRun) {
      fs.writeFileSync(filePath, newContent, 'utf8');
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
