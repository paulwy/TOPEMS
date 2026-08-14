#!/usr/bin/env node
/**
 * V212-L2b-fix · 二次修正脚本
 *
 * 处理 C2 批量脚本替换后的遗留：
 *   '#10b981'  →  中间态 'colors.success.dark'  →  需要区分上下文转为：
 *     (a) sx prop 的 MUI palette 简写：'success.dark' 或
 *     (b) 普通运行时对象中的实际引用：designTokens.colors.success.dark（无引号）
 *
 * 规则：
 *  - 只处理之前 C2 批量替换的 116 个文件
 *  - 不在 sx prop / styled component 中：→ designTokens.colors.X.Y（无引号表达式）
 *  - 在 sx={{ bgcolor: / color: / borderColor: / etc. }} 中：→ 'X.Y'（MUI 原生 palette 简写）
 *  - 删除重复 import；为使用 designTokens 的文件补 import（若未导入）
 *
 * 用法:
 *   node scripts/audit/fix-colors-reference-fix.mjs           # dry run
 *   node scripts/audit/fix-colors-reference-fix.mjs --apply   # 真正写文件
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.env.TOPEMS_ROOT || '/Users/air/TOPEMS';
const SRC = join(ROOT, 'apps/web/src');
const SUMMARY_PATH = join(ROOT, 'docs/audit/fix-design-tokens-batch-summary.json');

// MUI sx prop 中接受 palette 路径简写的 key 集合
const MUI_SX_COLOR_KEYS = new Set([
  'bgcolor', 'Bgcolor',
  'color', 'Color',
  'borderColor',
  'backgroundColor',
  'bgImage',
  'fill',
  'stroke',
]);

// 支持 tokens 前缀（允许 semicolon 分隔的 'colors.X' 形式）
const ALLOWED_COLOR_PREFIXES = ['colors', 'background', 'border'];

// ─── 工具函数 ───

function walk(dir, results) {
  results = results || [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full).replaceAll('\\', '/');
    if (['/node_modules/', '/dist/'].some((p) => rel.includes(p))) continue;
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

/**
 * 解析 colors.xxx.yyy → 返回 { prefix, chain }
 *   'colors.success.dark' → { prefix: 'colors', chain: ['success','dark'] }
 *   'background.selectedDark' → { prefix: 'background', chain: ['selectedDark'] }
 *   'colors.cyber.glass.bg' → { prefix: 'colors', chain: ['cyber','glass','bg'] }
 */
function parseTokensPath(s) {
  // 去掉引号（如果存在）
  const inner = s.replace(/^['"`]|['"`]$/g, '');
  if (!inner.includes('.')) return null;
  const parts = inner.split('.');
  if (!ALLOWED_COLOR_PREFIXES.includes(parts[0])) return null;
  return { prefix: parts[0], chain: parts.slice(1) };
}

/** 判断某个片段是否处于 sx={{ ... }} 嵌套对象上下文中（简化启发式）
 *  启发式：向上/向下 30 行内看是否能匹配 `sx={` 或 `sx={{`，再用括号栈判定。
 */
function buildSxLineRanges(content) {
  const lines = content.split('\n');
  const ranges = []; // [startLineIdx, endLineIdx]
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idx = line.indexOf('sx={');
    if (idx < 0) continue;
    let depth = 0;
    let started = false;
    for (let j = i; j < lines.length && j - i < 80; j++) {
      const L = lines[j];
      for (let k = 0; k < L.length; k++) {
        const c = L[k];
        if (!started) {
          if (c === '{') { started = true; depth = 1; }
          continue;
        }
        if (c === '{') depth++;
        if (c === '}') {
          depth--;
          if (depth === 0) {
            ranges.push([i, j]);
            j = lines.length; // 跳出外层
            break;
          }
        }
      }
    }
  }
  return ranges;
}

function isInSxContext(lineIdx, ranges) {
  return ranges.some(([s, e]) => lineIdx >= s && lineIdx <= e);
}

/**
 * 判断该行中给定颜色引用的"键上下文"：
 *   查找紧邻前一个非空格字符，若是 'color:' / 'bgcolor:'，返回 MUI sx 风格键。
 */
function getContextKey(line, pos) {
  // 从 pos 向前扫描，找到 : 前的单词（最近的冒号）
  const before = line.slice(0, pos);
  const m = before.match(/(\w+)\s*:\s*$/);
  return m ? m[1] : null;
}

/** 生成 MUI sx 简写：colors.success.dark → 'success.dark'；background.selectedDark → 'selectedDark'；colors.primary.main → 'primary.main' */
function muiShorten(prefix, chain) {
  if (prefix === 'colors') {
    // palette 项：primary / secondary / success / warning / error / info / grey / text / background / border / action + 扩展色名
    return chain.join('.');
  }
  if (prefix === 'background') {
    // 'background.paper' -> MUI 常用直接字符串 'background.paper'（sx 支持）
    return 'background.' + chain.join('.');
  }
  if (prefix === 'border') {
    return 'border.' + chain.join('.');
  }
  return null;
}

/** 为文件补 import：`import { designTokens, semanticTokens } from '@topems/tokens';` */
function ensureTokensImport(content, used) {
  if (!used) return content;
  if (content.includes("from '@topems/tokens'")) {
    // 检查 designTokens 是否在 import 列表中
    if (!content.match(/import\s*\{[^}]*\bdesignTokens\b[^}]*\}\s*from\s*['"]@topems\/tokens/)) {
      return content.replace(
        /(import\s*\{[^}]*)\}\s*from\s*['"]@topems\/tokens/,
        (m, before) => before.includes('semanticTokens')
          ? before + ', designTokens } from \'@topems/tokens\''
          : before + ', designTokens, semanticTokens } from \'@topems/tokens\''
      );
    }
    return content;
  }
  if (content.includes("from 'theme/tokens'") || content.includes('from "theme/tokens"')) {
    // 不碰已有 theme/tokens import（语义不同，保持路径），但追加 designTokens
    if (!content.match(/import\s*\{[^}]*\bdesignTokens\b[^}]*\}\s*from\s*['"]theme\/tokens/)) {
      return content.replace(
        /(import\s*\{[^}]*)\}\s*from\s*['"](theme\/tokens)['"]/,
        (m, before) => before.includes('semanticTokens')
          ? before + ', designTokens } from \'theme/tokens\''
          : before + ', designTokens, semanticTokens } from \'theme/tokens\''
      );
    }
    return content;
  }
  // 新建 import，放在文件第一行非 import 之前
  const lines = content.split('\n');
  // 找到最后一个 import 行的位置
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) lastImportIdx = i;
  }
  const insertPos = lastImportIdx >= 0 ? lastImportIdx + 1 : 0;
  const insert = "import { designTokens, semanticTokens } from '@topems/tokens';";
  lines.splice(insertPos, 0, insert);
  return lines.join('\n');
}

// ─── 入口 ───

const args = process.argv.slice(2);
const apply = args.includes('--apply');

// 读取 C2 报告里的 116 命中文件，只处理这些
let targetFiles = [];
if (existsSync(SUMMARY_PATH)) {
  try {
    const summary = JSON.parse(readFileSync(SUMMARY_PATH, 'utf-8'));
    targetFiles = summary.top_20_files.map((x) => x.file);
    // 扫描全量 tsx/ts 找 'colors.*' 中间态——实际只要包含 C2 中间态的文件都处理
  } catch {}
}

// 兜底：扫全部 tsx/ts 文件中含 'colors.' 中间态的
const allTsx = walk(SRC);
const filesToProcess = allTsx.filter((f) => {
  const c = readFileSync(f, 'utf-8');
  // 匹配引号中的 colors.<word>.*.<word> 中间态（由 C2 脚本生成）
  return /['"`]colors\.[a-zA-Z]+\.[a-zA-Z\d]+['"`]/.test(c)
    || /['"`]background\.[a-zA-Z]+['"`]/.test(c)
    || /['"`]border\.[a-zA-Z]+['"`]/.test(c);
});

console.log('Fixing up ' + filesToProcess.length + ' files (remove colors.* string literal → actual reference)\n');

let totalFixes = 0;
const byKind = { mui_sx: 0, runtime_expr: 0 };
let changedFiles = 0;

for (const file of filesToProcess) {
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  let content = readFileSync(file, 'utf-8');
  const sxRanges = buildSxLineRanges(content);

  const lines = content.split('\n');
  let usesDesignTokens = false;
  const replacedLineNos = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // 全局正则找引号中的 tokens 路径，按位置上下文二次处理
    // 用 look-for + replace 回调，每次取 pos
    const regex = /(['"`])((?:colors|background|border)\.[a-zA-Z_][\w]*?\.[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*?)\1/g;
    line = line.replace(regex, (match, q, inner, offset) => {
      const parsed = parseTokensPath(inner);
      if (!parsed) return match;
      const keyName = getContextKey(line, offset);
      const inSx = isInSxContext(i, sxRanges);
      const muiShort = keyName && MUI_SX_COLOR_KEYS.has(keyName.toLowerCase())
        ? muiShorten(parsed.prefix, parsed.chain)
        : null;

      if (inSx && MUI_SX_COLOR_KEYS.has(keyName ? keyName.toLowerCase() : '')) {
        byKind.mui_sx++;
        replacedLineNos.push(i + 1);
        return q + (muiShort || inner) + q;
      }
      if (inSx && muiShort) {
        // sx 中 但没明确 key，仍优先用 MUI sx palette 路径字符串（更保险）
        byKind.mui_sx++;
        replacedLineNos.push(i + 1);
        return q + muiShort + q;
      }
      // 运行时引用：designTokens.colors.success.dark（无引号表达式）
      usesDesignTokens = true;
      byKind.runtime_expr++;
      replacedLineNos.push(i + 1);
      return `designTokens.${parsed.prefix}.${parsed.chain.join('.')}`;
    });
    if (line !== lines[i]) lines[i] = line;
  }

  const newContentRaw = lines.join('\n');
  const newContent = usesDesignTokens ? ensureTokensImport(newContentRaw, true) : newContentRaw;

  if (newContent !== content) {
    totalFixes += replacedLineNos.length;
    changedFiles++;
    if (apply) {
      writeFileSync(file, newContent, 'utf-8');
    }
    if (changedFiles <= 10) {
      console.log(('  ' + rel).padEnd(75) + '  fixes=' + replacedLineNos.length);
    }
  }
}

console.log('\n================= Summary =================');
console.log('Mode: ' + (apply ? 'APPLY' : 'DRY-RUN'));
console.log('Processed files: ' + filesToProcess.length);
console.log('Changed files:   ' + changedFiles);
console.log('Total fixes:     ' + totalFixes);
console.log('  · sx MUI shorthand:   ' + byKind.mui_sx);
console.log('  · runtime designTokens:' + byKind.runtime_expr);
console.log('\nJSON:   docs/audit/fix-colors-reference-fix-summary.json');
console.log(apply ? '' : '\nℹ️  追加 --apply 真正写文件');

writeFileSync(
  join(ROOT, 'docs/audit/fix-colors-reference-fix-summary.json'),
  JSON.stringify({
    generated_at: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    processed_files: filesToProcess.length,
    changed_files: changedFiles,
    total_fixes: totalFixes,
    by_kind: byKind,
  }, null, 2)
);
