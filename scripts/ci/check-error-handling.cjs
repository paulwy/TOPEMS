#!/usr/bin/env node
/**
 * Gate · 统一错误出口检查（V517）
 * =============================================================================
 * 规则与决策依据：docs/architecture/unified-error-handling-decision.md
 *
 * 拦截三类问题：
 *   1. leak-internal-error  把原始错误 format! 进客户端响应（信息泄露）
 *                            e.g. ApiResponse::error(500, &format!("查询失败: {}", e))
 *   2. anyhow-in-business   svc 业务层新增 anyhow（应改用 TopemsError）
 *                            anyhow 仅允许出现在 main.rs / bootstrap 进程边界
 *   3. raw-error-to-string  客户端响应里直接 <err>.to_string()
 *
 * 用法：
 *   node scripts/ci/check-error-handling.cjs                  # 全量报告，不失败
 *   node scripts/ci/check-error-handling.cjs --changed-only   # CI：只拦本次改动新增
 *   node scripts/ci/check-error-handling.cjs --strict         # 本地：任何命中即失败
 *   node scripts/ci/check-error-handling.cjs --by-service     # 附按服务的泄露分布（排期用）
 * =============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SVC_DIR = path.join(ROOT, 'svc');
const BASELINE_FILE = path.join(__dirname, 'error-handling-baseline.json');

const SKIP_DIRS = new Set(['target', 'node_modules', '.git', '_archive', '.sqlx', 'dist']);
// 业务层：svc/<svc>/src/{modules,services,handlers,repositories}
const BIZ_DIRS = new Set(['modules', 'services', 'handlers', 'repositories']);
// 错误变量命名（用于"是否把错误对象暴露给客户端"的判断）
const ERR_VAR = '(?:e|err|error|ex|io_err|sql_err|db_err|db_error|repo_err|err_msg|anyhow_err)';

const args = new Set(process.argv.slice(2));
const CHANGED_ONLY = args.has('--changed-only');
const STRICT = args.has('--strict');
const BY_SERVICE = args.has('--by-service');

// -----------------------------------------------------------------------------
// 规则定义
//
// 检测粒度：**语句级**（括号配平），而非单行。
// 背景：历史实现按单行匹配，`ApiResponse::error(` 跨行的调用会整片漏检
//       （修复前全仓漏检 85 处，如 svc/integration/src/external_erp.rs）。
// -----------------------------------------------------------------------------
const RULES = {
  'leak-internal-error': {
    desc: '把原始错误拼接进客户端响应（内部细节泄露）',
    hint: '改用 TopemsError::internal("业务上下文", e) → ApiResponse::from(..)，或 HandlerResult<T>',
    match(args) {
      if (!args.includes('format!')) return false;
      // format!("...: {}", e) / format!("... {}", err) 形态
      return (
        new RegExp(`\\{\\}\\s*",?\\s*${ERR_VAR}\\b`).test(args) ||
        new RegExp(`\\{\\}\\s*",?\\s*&?${ERR_VAR}\\.`).test(args)
      );
    },
  },
  'raw-error-to-string': {
    desc: '客户端响应里直接 .to_string() 内部错误',
    hint: '改用 TopemsError（classify() 已保证细节只进日志）',
    match(args) {
      if (args.includes('format!')) return false; // 已由 leak-internal-error 覆盖
      return new RegExp(`${ERR_VAR}\\.to_string\\(\\)`).test(args);
    },
  },
  'anyhow-in-business': {
    desc: '业务层使用 anyhow（应使用 TopemsError）',
    hint: 'anyhow 仅允许在 main.rs / bootstrap 进程边界；业务层返回 Result<T, TopemsError>',
    fileOnly: true,
    matchFile(content) {
      return /\banyhow::/.test(content) ? content.split('\n').length : 0;
    },
  },
};

// -----------------------------------------------------------------------------
// 遍历
// -----------------------------------------------------------------------------
function* walkRustFiles(dir) {
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        if (!SKIP_DIRS.has(ent.name)) stack.push(full);
      } else if (ent.name.endsWith('.rs')) {
        yield full;
      }
    }
  }
}

// -----------------------------------------------------------------------------
// 语句级参数提取（括号配平，跳过字符串字面量）
// -----------------------------------------------------------------------------
const CALL_RX = /ApiResponse::error\(/g;

/**
 * 从 `(` 的位置起做括号配平，返回该调用的参数文本。
 *
 * 已知局限（保守取向）：不解析注释与原始字符串，若参数内出现含括号的 `//` 注释
 * 或 `r"("`，配平可能提前/延后结束——宁可多报（取到文件尾）也不漏报。
 *
 * @param {string} content 文件全文
 * @param {number} openIdx `(` 的字符索引
 */
function extractArgs(content, openIdx) {
  let depth = 1;
  let inStr = false;
  let esc = false;
  for (let j = openIdx + 1; j < content.length; j += 1) {
    const c = content[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === '(') {
      depth += 1;
    } else if (c === ')') {
      depth -= 1;
      if (depth === 0) return content.slice(openIdx + 1, j);
    }
  }
  return content.slice(openIdx + 1); // 未配平：保守取到文件尾
}

function isBusinessLayer(file) {
  const rel = path.relative(SVC_DIR, file).split(path.sep); // <svc>/src/<layer>/...
  return rel.length >= 3 && rel[1] === 'src' && BIZ_DIRS.has(rel[2]) && rel[rel.length - 1] !== 'main.rs';
}

function scan() {
  const violations = [];
  const totals = { apiResponseError: 0, leakInternalError: 0, rawErrorToString: 0, anyhowInBusiness: 0 };
  // 按服务的泄露分布（leak + raw），用于排定迁移顺序
  const byService = {};
  const bump = (relPath, n = 1) => {
    const svc = path.relative(SVC_DIR, path.join(ROOT, relPath)).split(path.sep)[0];
    byService[svc] = (byService[svc] || 0) + n;
  };

  for (const file of walkRustFiles(SVC_DIR)) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const relPath = path.relative(ROOT, file);

    totals.apiResponseError += (content.match(/ApiResponse::error\(/g) || []).length;

    // 语句级检测：逐 `ApiResponse::error(` 提取完整参数后判定
    CALL_RX.lastIndex = 0;
    let m;
    while ((m = CALL_RX.exec(content)) !== null) {
      const openIdx = m.index + m[0].length - 1; // '(' 的索引
      const args = extractArgs(content, openIdx);
      for (const name of ['leak-internal-error', 'raw-error-to-string']) {
        if (RULES[name].match(args)) {
          const line = content.slice(0, m.index).split('\n').length;
          violations.push({
            rule: name,
            file: relPath,
            line,
            text: args.replace(/\s+/g, ' ').trim().slice(0, 120),
          });
          if (name === 'leak-internal-error') totals.leakInternalError += 1;
          else totals.rawErrorToString += 1;
          bump(relPath);
          break; // 一条调用只归属一个规则
        }
      }
    }

    if (isBusinessLayer(file) && RULES['anyhow-in-business'].matchFile(content)) {
      const hits = (content.match(/\banyhow::/g) || []).length;
      totals.anyhowInBusiness += hits;
      violations.push({
        rule: 'anyhow-in-business',
        file: relPath,
        line: 1,
        text: `anyhow:: ×${hits}`,
      });
    }
  }
  return { violations, totals, byService };
}

// -----------------------------------------------------------------------------
// 变更文件定位（--changed-only）
// -----------------------------------------------------------------------------
/**
 * 取"相对 origin/main 的合并基点"到工作区的变更文件集合。
 * 粒度选择：按**文件**而非行号判断——新增文件/新增函数体是主要场景，
 * 行号映射在格式化重排时容易误判，且宁可漏报不可误报（避免阻塞无关 PR）。
 * 无法取得 diff 时返回 null，由调用方降级为全量报告。
 */
function changedFiles() {
  let base = 'HEAD';
  try {
    base = execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim() || 'HEAD';
  } catch {
    base = 'HEAD';
  }
  try {
    const out = execSync(`git diff --name-only --diff-filter=ACM ${base}`, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    }).toString();
    return new Set(out.split('\n').filter(Boolean));
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// 主流程
// -----------------------------------------------------------------------------
function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const { violations, totals, byService } = scan();
  const baseline = loadBaseline();

  let shown = violations;
  let modeLabel = '全量';

  if (CHANGED_ONLY) {
    const files = changedFiles();
    if (files) {
      shown = violations.filter((v) => files.has(v.file));
      modeLabel = '仅本次改动文件';
    } else {
      modeLabel = '全量（无法获取 git diff，降级）';
    }
  }

  console.log('\n=== 统一错误出口检查（V517）===');
  console.log(`模式：${modeLabel}`);
  console.log('\n--- 存量基线 ---');
  console.log(`  ApiResponse::error(...)        : ${totals.apiResponseError}${delta(totals.apiResponseError, baseline?.apiResponseErrorTotal)}`);
  console.log(`  内部细节泄露形态               : ${totals.leakInternalError}${delta(totals.leakInternalError, baseline?.leakInternalError)}`);
  console.log(`  .to_string() 直出错误         : ${totals.rawErrorToString}`);
  console.log(`  业务层 anyhow::               : ${totals.anyhowInBusiness}${delta(totals.anyhowInBusiness, baseline?.anyhowInBusinessLayer)}`);
  const surface = totals.leakInternalError + totals.rawErrorToString;
  console.log(`  泄露面合计                     : ${surface}${delta(surface, baseline?.leakSurfaceTotal)}`);

  if (BY_SERVICE) {
    const ranked = Object.entries(byService).sort((a, b) => b[1] - a[1]);
    console.log(`\n--- 按服务泄露分布（共 ${ranked.length} 个服务，迁移排期用）---`);
    for (const [svc, n] of ranked) console.log(`  ${String(n).padStart(4)}  svc/${svc}`);
  }

  if (shown.length) {
    console.log(`\n--- 命中明细（${shown.length} 处）---`);
    const byRule = {};
    for (const v of shown) (byRule[v.rule] ||= []).push(v);
    for (const [rule, list] of Object.entries(byRule)) {
      console.log(`\n[${rule}] ${RULES[rule].desc}`);
      console.log(`  → ${RULES[rule].hint}`);
      for (const v of list.slice(0, 15)) {
        console.log(`  ${v.file}:${v.line}  ${v.text}`);
      }
      if (list.length > 15) console.log(`  ... 其余 ${list.length - 15} 处省略`);
    }
  } else {
    console.log('\n✅ 未发现命中。');
  }

  console.log('\n参考：docs/architecture/unified-error-handling-decision.md\n');

  if (STRICT && violations.length > 0) process.exit(1);
  if (CHANGED_ONLY && shown.length > 0) {
    console.log(`❌ 本次改动新增 ${shown.length} 处错误出口违规。\n`);
    process.exit(1);
  }
  process.exit(0);
}

function delta(now, base) {
  if (typeof base !== 'number') return '';
  const d = now - base;
  if (d === 0) return '  (= 基线)';
  return d > 0 ? `  (⚠️ 较基线 +${d})` : `  (✅ 较基线 ${d})`;
}

main();
