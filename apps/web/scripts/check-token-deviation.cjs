#!/usr/bin/env node
/**
 * check-token-deviation.cjs
 *
 * CI 脚本：扫描组件源文件中的硬编码设计值，检测是否偏离官方 design tokens。
 *
 * 用法: node scripts/check-token-deviation.cjs
 *
 * 退出码:
 *   0 — 无违规
 *   1 — 发现违规
 */

const fs = require('fs');
const path = require('path');

// ─── 配置 ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const TOKENS_FILE = path.join(ROOT, 'src', 'theme', 'tokens.ts');
const COMPONENTS_DIR = path.join(ROOT, 'src', 'components');

// 需要跳过的目录（这些组件有特殊样式需求）
const SKIP_DIRS = [
  'ai',
  'bi',
  'charts',
  'gis',
  'export',
  '__tests__',
];

// 允许的注释标记（在该行出现则跳过）
const ALLOW_COMMENT = '// token-deviation:allow';

// ─── Token 提取 ───────────────────────────────────────────────────────────────

/**
 * 从 tokens.ts 的 designTokens.colors 中提取所有 hex 颜色值。
 * 使用正则而非 import，因为这是 .cjs 文件，无法直接 import .ts。
 */
function extractAllowedColors(tokensPath) {
  const src = fs.readFileSync(tokensPath, 'utf-8');

  // 只取 designTokens.colors 部分（从 `colors: {` 到该层级的闭合 `},`）
  // 简单策略：提取整个文件中所有 hex 颜色值即可（文件本身就是 token 定义）
  const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
  const matches = src.match(hexRegex) || [];

  // 标准化：全部转小写，3位缩写展开为6位
  const allowed = new Set();
  for (const m of matches) {
    let normalized = m.toLowerCase();
    // #abc → #aabbcc
    if (normalized.length === 4) {
      normalized = '#' + normalized[1] + normalized[1] + normalized[2] + normalized[2] + normalized[3] + normalized[3];
    }
    allowed.add(normalized);
  }

  return allowed;
}

// ─── 文件扫描 ─────────────────────────────────────────────────────────────────

/**
 * 递归获取 components/ 下所有 .tsx 和 .ts 文件，排除跳过目录和 .stories. 文件。
 */
function collectFiles(dir, skipDirs) {
  const results = [];

  function walk(d) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return; // 权限或不存在，跳过
    }

    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);

      // 跳过 node_modules 等隐藏目录
      if (entry.name.startsWith('.')) continue;

      // 跳过指定目录
      if (entry.isDirectory() && skipDirs.includes(entry.name)) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) &&
        !entry.name.includes('.stories.')
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

// ─── 违规检测 ─────────────────────────────────────────────────────────────────

/**
 * 检测单文件中的硬编码设计值。
 * 返回 violations 数组: [{ line, type, value, context }]
 */
function checkFile(filePath, allowedColors) {
  const src = fs.readFileSync(filePath, 'utf-8');
  const lines = src.split('\n');
  const violations = [];

  // MUI spacing token 的数值集合（允许作为 sx/style 的数字间距值）
  const allowedSpacingValues = new Set([0, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // 跳过含 allow 标记的行
    if (line.includes(ALLOW_COMMENT)) continue;

    // 跳过纯注释行和 import 行
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('import ')) continue;

    // 跳过类型声明行（纯类型，不包含实际值）
    if (trimmed.startsWith('export type') || trimmed.startsWith('type ')) continue;

    // ── 1. 检测硬编码 hex 颜色 ──
    const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(line)) !== null) {
      const raw = hexMatch[0];
      let normalized = raw.toLowerCase();
      if (normalized.length === 4) {
        normalized = '#' + normalized[1] + normalized[1] + normalized[2] + normalized[2] + normalized[3] + normalized[3];
      }

      if (!allowedColors.has(normalized)) {
        violations.push({
          line: lineNum,
          type: 'hardcoded-color',
          value: raw,
          context: trimmed.substring(0, 120),
        });
      }
    }

    // ── 2. 检测硬编码 rgba/rgb ──
    const rgbaRegex = /rgba?\s*\([^)]*\)/g;
    let rgbaMatch;
    while ((rgbaMatch = rgbaRegex.exec(line)) !== null) {
      const raw = rgbaMatch[0];

      // 跳过 rgba(0, 0, 0, ...) 遮罩覆盖模式
      if (/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,/.test(raw)) continue;

      // 跳过 rgb(0 0 0 / ...) 格式（现代 CSS，用于阴影 token）
      if (/rgba?\(\s*0\s+\d/.test(raw) && raw.includes('/')) continue;

      violations.push({
        line: lineNum,
        type: 'hardcoded-rgba',
        value: raw,
        context: trimmed.substring(0, 120),
      });
    }

    // ── 3. 检测 sx/style 中的魔术数字间距 ──
    // 匹配模式:
    //   padding: '16px'  /  padding: "16px"
    //   gap: 24          /  gap: 24,
    //   p: 2             /  px: 3
    //   margin: '8px 16px'
    //   marginBottom: 16

    // 模式 A: 属性: '数字px'  (带引号的 px 值)
    const pxInStringRegex =
      /(?:padding|margin|gap|top|bottom|left|right|width|height|marginBottom|marginTop|marginLeft|marginRight|paddingBottom|paddingTop|paddingLeft|paddingRight)\s*:\s*['"][\d\s.]+px['"]/g;
    let pxStrMatch;
    while ((pxStrMatch = pxInStringRegex.exec(line)) !== null) {
      violations.push({
        line: lineNum,
        type: 'magic-number-spacing',
        value: pxStrMatch[0].trim(),
        context: trimmed.substring(0, 120),
      });
    }

    // 模式 B: 短属性: 数字  (MUI spacing 数字值，如 p: 2, m: 3, px: 1.5)
    // 只匹配在 sx={{ }} 或 style={{ }} 块中（简化判断：行中包含 sx 或 style）
    const isSxOrStyle = /\bsx\b|\bstyle\b/.test(line);
    if (isSxOrStyle) {
      // 短属性名: p, m, pt, pb, pl, pr, px, py, mt, mb, ml, mr, mx, my, gap
      const shortPropNumRegex =
        /\b(?:p|m|pt|pb|pl|pr|px|py|mt|mb|ml|mr|mx|my|gap)\s*:\s*(\d+\.?\d*)\b/g;
      let shortMatch;
      while ((shortMatch = shortPropNumRegex.exec(line)) !== null) {
        const numVal = parseFloat(shortMatch[1]);
        if (!allowedSpacingValues.has(numVal)) {
          violations.push({
            line: lineNum,
            type: 'magic-number-spacing',
            value: shortMatch[0].trim(),
            context: trimmed.substring(0, 120),
          });
        }
      }

      // 长属性名: padding, margin, marginTop 等 + 数字 (不带引号的纯数字)
      const longPropNumRegex =
        /\b(?:padding|margin|marginTop|marginBottom|marginLeft|marginRight|paddingTop|paddingBottom|paddingLeft|paddingRight|gap)\s*:\s*(\d+\.?\d*)\b/g;
      let longMatch;
      while ((longMatch = longPropNumRegex.exec(line)) !== null) {
        const numVal = parseFloat(longMatch[1]);
        if (!allowedSpacingValues.has(numVal)) {
          violations.push({
            line: lineNum,
            type: 'magic-number-spacing',
            value: longMatch[0].trim(),
            context: trimmed.substring(0, 120),
          });
        }
      }
    }
  }

  return violations;
}

// ─── 主流程 ────────────────────────────────────────────────────────────────────

function main() {
  // 1. 提取允许的颜色集
  if (!fs.existsSync(TOKENS_FILE)) {
    console.error(`ERROR: Token file not found: ${TOKENS_FILE}`);
    process.exit(2);
  }

  const allowedColors = extractAllowedColors(TOKENS_FILE);
  console.log(`[info] Loaded ${allowedColors.size} allowed color tokens from tokens.ts`);
  console.log('');

  // 2. 收集待检查文件
  if (!fs.existsSync(COMPONENTS_DIR)) {
    console.error(`ERROR: Components directory not found: ${COMPONENTS_DIR}`);
    process.exit(2);
  }

  const files = collectFiles(COMPONENTS_DIR, SKIP_DIRS);
  console.log(`[info] Scanning ${files.length} component files under src/components/`);
  console.log(`[info] Skipping directories: ${SKIP_DIRS.join(', ')}`);
  console.log('');

  // 3. 逐文件检查
  const allViolations = [];

  for (const filePath of files) {
    const violations = checkFile(filePath, allowedColors);
    if (violations.length > 0) {
      const relPath = path.relative(ROOT, filePath);
      allViolations.push({ file: relPath, violations });
    }
  }

  // 4. 输出结果
  console.log('='.repeat(80));
  console.log('TOKEN DEVIATION CHECK RESULTS');
  console.log('='.repeat(80));
  console.log('');

  if (allViolations.length === 0) {
    console.log('No violations found. All component styles use approved design tokens.');
    console.log('');
    console.log(`Files scanned: ${files.length}`);
    console.log(`Violations:     0`);
    process.exit(0);
  }

  let totalViolations = 0;

  for (const entry of allViolations) {
    console.log(`--- ${entry.file} (${entry.violations.length} violation(s)) ---`);
    for (const v of entry.violations) {
      console.log(`  L${String(v.line).padStart(4)}  [${v.type}]  ${v.value}`);
      console.log(`         ${v.context}`);
      totalViolations++;
    }
    console.log('');
  }

  // 汇总
  console.log('-'.repeat(80));
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files with violations: ${allViolations.length}`);
  console.log(`Total violations: ${totalViolations}`);
  console.log('-'.repeat(80));
  console.log('');
  console.log('Suggestion: Replace hardcoded values with designTokens.* or semanticTokens.* references.');
  console.log('To suppress a specific line, add: // token-deviation:allow');

  process.exit(1);
}

main();
