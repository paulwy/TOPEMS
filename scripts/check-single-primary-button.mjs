#!/usr/bin/env node
/**
 * scripts/check-single-primary-button.mjs
 * =============================================================
 * 导航架构 §15.2 L553 + §13.2 L501 合规检查器：唯一主按钮原则
 * 规范：
 *   (1) PageHeader / DetailPageTemplate actions 数组中
 *       `variant === 'contained' && color === 'primary'` 的项数 ≤ 1
 *   (2) 含 `color === 'error'` 的操作应配套 Dialog 二次确认弱校验
 *
 * 匹配模式（覆盖 JSX prop 两种常见写法）：
 *   (a) 字面量 inline：  actions={[ {...}, {...} ]}
 *   (b) 变量引用：       actions={pageActions}   → 回溯
 *                        const pageActions = [ ... ]
 *
 * V1.1 / 2026-08-09（Fix：JSX prop 必须用 {} 包裹，regex 加上 \{ 层）
 * ============================================================= */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SCAN_ROOTS = [resolve(REPO_ROOT, 'apps/web/src/pages'), resolve(REPO_ROOT, 'apps/web/src/modules')];
function globTsx(rootDir) {
  if (!existsSync(rootDir)) return [];
  return execSync(`find '${rootDir}' -type f \\( -name '*.tsx' -o -name '*.ts' \\) -print0`, { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

/** 给定起始 pos，从 src 中 depth 扫描找到匹配的闭合 index；
 *  open = '{' / '['  自动匹配 '}' / ']'  */
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

/** 提取 JSX prop `actions={...}` 的内部表达式，区分数组字面量 vs 标识符 */
function extractAllActionsBlocks(tsx) {
  const blocks = []; // { kind: 'inline' | 'var', text, varName?, line, fileText: tsx }
  // 匹配 actions=  后面紧跟 { ... } JSX 表达式
  const re = /\bactions\s*=\s*\{/g;
  let m;
  while ((m = re.exec(tsx)) !== null) {
    const braceOpen = tsx.indexOf('{', m.index);
    const braceClose = findMatchingClose(tsx, braceOpen, '{');
    if (braceClose === -1) continue;
    const inside = tsx.slice(braceOpen + 1, braceClose).trim();
    const line = tsx.slice(0, m.index).split('\n').length;
    if (inside.startsWith('[')) {
      // inline 字面量
      const arrText = inside.slice();
      // 找 ] 闭合（已经在 inside 里，因为整个 {contents} 是一个表达式 '[...]'）
      const arr = arrText; // inside 其实就是 '[...]' 文本
      blocks.push({ kind: 'inline', text: arr, line });
    } else if (/^[A-Za-z_$][\w$]*$/.test(inside)) {
      // 变量引用
      blocks.push({ kind: 'var', varName: inside, line, text: null });
    }
    // 其他情况：条件表达式 / spread / 函数调用等 —— 静态解析不可达，跳过
  }
  return blocks;
}

/** 在 tsx 中回溯 const <varName> = [...] 或 = [...] + 类型注解 */
function resolveVarArray(tsx, varName) {
  const re = new RegExp(`\\b(?:const|let)\\s+${varName}\\b[^=]*=\\s*\\[`, 's');
  const m = tsx.match(re);
  if (!m) return null;
  const bracketStart = tsx.indexOf('[', m.index);
  const bracketClose = findMatchingClose(tsx, bracketStart, '[');
  if (bracketClose === -1) return null;
  return tsx.slice(bracketStart, bracketClose + 1);
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

function main() {
  const cyan = '\x1b[36m',
    green = '\x1b[32m',
    yellow = '\x1b[33m',
    red = '\x1b[31m',
    reset = '\x1b[0m';
  console.log(`${cyan}===== 导航架构 §15.2 L553 + §13.2：唯一主按钮检查 =====${reset}`);
  const files = SCAN_ROOTS.flatMap(globTsx);
  console.log(`扫描：${files.length} 文件（pages + modules）`);

  const stat = {
    fileScanned: files.length,
    blocks: 0,
    inline: 0,
    resolvedVar: 0,
    unresolvedVar: 0,
    violations: 0,
    warnings: 0,
  };
  const issues = [];
  const pages2Primary = [];

  for (const file of files) {
    const tsx = readFileSync(file, 'utf8');
    const rel = file.replace(REPO_ROOT + '/', '');
    const blocks = extractAllActionsBlocks(tsx);
    stat.blocks += blocks.length;

    for (const blk of blocks) {
      let arrText = blk.text;
      if (blk.kind === 'var') {
        const res = resolveVarArray(tsx, blk.varName);
        if (res) {
          arrText = res;
          stat.resolvedVar++;
        } else {
          stat.unresolvedVar++;
          continue;
        } // 静态不可达，安全跳过
      } else {
        stat.inline++;
      }
      // 如果 inline 形态的 arrText 是 '[...]'（花括号内直接以 [ 开头），
      // 但可能 arrText 末尾不是 ]，因为它在 inside 里，用 findMatchingClose 保证。
      if (!arrText) continue;
      if (arrText[0] !== '[') {
        // 兜底：在 arrText 中找首个 [ 开始重切片
        const bs = arrText.indexOf('[');
        if (bs === -1) continue;
        const be = findMatchingClose(arrText, bs, '[');
        if (be === -1) continue;
        arrText = arrText.slice(bs, be + 1);
      }
      const items = splitTopLevelCommas(arrText.slice(1, -1));
      const parsed = items.map(extractProps).filter((p) => p.variant || p.color || p.label);

      // (1) contained+primary 计数
      const primaryCount = parsed.filter(
        (p) => (p.variant || 'outlined') === 'contained' && (p.color || 'primary') === 'primary'
      ).length;
      if (primaryCount > 1) {
        stat.violations++;
        issues.push({
          file: rel,
          line: blk.line,
          severity: 'error',
          msg:
            `${blk.kind === 'var' ? `[var=${blk.varName}] ` : ''}` +
            `检测到 ${primaryCount} 个 contained+primary 主按钮（规范 ≤ 1）§13.2 L501`,
        });
        pages2Primary.push(`${rel}:${blk.line} (${primaryCount}个，${blk.kind})`);
      }

      // (2) color=error 必须配套 Dialog
      const errorCount = parsed.filter((p) => p.color === 'error').length;
      if (errorCount > 0) {
        const hasDialog =
          /<Dialog\b|<ConfirmDialog|二次确认|确认对话框|Confirm\(\)|\.confirm\(|onClick=\{\(\)\s*=>\s*\{[^}]*确认/i.test(
            tsx
          );
        if (!hasDialog) {
          stat.warnings++;
          issues.push({
            file: rel,
            line: blk.line,
            severity: 'warn',
            msg:
              `${blk.kind === 'var' ? `[var=${blk.varName}] ` : ''}` +
              `含 ${errorCount} 个 color=error 危险操作，未发现 Dialog 二次确认 §15.2`,
          });
        }
      }
    }
  }

  for (const it of issues) {
    const tag = it.severity === 'error' ? `${red}ERR${reset}` : `${yellow}WRN${reset}`;
    console.log(`  [${tag}] ${it.file}:${it.line}  ${it.msg}`);
  }

  console.log(
    `\n${cyan}统计${reset}：${stat.fileScanned} 文件 · ${stat.blocks} actions-block` +
      `（inline=${stat.inline} + 解析变量=${stat.resolvedVar} + 未解=${stat.unresolvedVar}）` +
      ` · ${red}错误=${stat.violations}${reset} · ${yellow}告警=${stat.warnings}${reset}`
  );

  if (stat.violations === 0) {
    console.log(`\n${green}✅ PASS：唯一主按钮原则合规${reset}`);
    if (stat.warnings > 0) console.log(`${yellow}⚠  ${stat.warnings} 条 Dialog 缺失告警（建议性）${reset}`);
    process.exit(0);
  } else {
    console.log(`\n${red}❌ FAIL：${stat.violations} 页面含 ≥2 个 primary 主按钮${reset}`);
    pages2Primary.forEach((s) => console.log(`    · ${s}`));
    console.log(`\n  修正参考：navigation-architecture.md §13.2 L501 + §15.2 L553\n`);
    process.exit(1);
  }
}
main();
