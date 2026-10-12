#!/usr/bin/env node
/**
 * Gate · 桥接网完备性检查（B7 收尾 V518）
 * =============================================================================
 * 规则与决策依据：TODO.md「B7 桥接网完备性复查」
 *
 * 拦截：新增 `pub enum XxxError` / `pub struct XxxError`（传播型错误类型）
 * 未提供 `impl From<XxxError> for TopemsError` 桥接。
 *
 * 背景：B7 已达成 68 错误类型 / 46 显式桥接 / 传播型 100% 覆盖。
 * 本门禁防止未来新增错误类型时桥接网回退（新增错误裸 `?` 传播需 map_err 兜底，
 * 语义不一致且易遗漏）。
 *
 * 豁免分类（bridge-coverage-allowlist.json）：
 *   - dto:      响应/DTO 结构（JsonRpcError/GraphqlError/ApiError 等，非传播错误）
 *   - test-only: finance 正确性测试断言类型（YearEndCloseError 等，不参与 `?`）
 *   - orphan:   孤儿规则限制（shared-mcp 不依赖 shared-core，impl 无处安放）
 *   - self:     TopemsError 自身
 *
 * 用法：
 *   node scripts/ci/check-bridge-coverage.cjs                # 全量报告，不失败
 *   node scripts/ci/check-bridge-coverage.cjs --changed-only # CI：只拦本次改动新增
 *   node scripts/ci/check-bridge-coverage.cjs --strict       # 本地：任何缺口即失败
 * =============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SVC_DIR = path.join(ROOT, 'svc');
const LIB_DIR = path.join(ROOT, 'lib');
const ALLOWLIST_FILE = path.join(__dirname, 'bridge-coverage-allowlist.json');

const args = new Set(process.argv.slice(2));
const CHANGED_ONLY = args.has('--changed-only');
const STRICT = args.has('--strict');

// -----------------------------------------------------------------------------
// 收集错误类型 + 桥接
// -----------------------------------------------------------------------------
function collectFiles() {
  const out = [];
  for (const base of [SVC_DIR, LIB_DIR]) {
    const walk = (dir) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (e.name === 'target' || e.name === 'node_modules' || e.name === '_archive') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.rs')) out.push(full);
      }
    };
    walk(base);
  }
  return out;
}

function scan() {
  const files = collectFiles();
  const errorTypes = {};   // name -> { file, kind, line }
  const bridged = new Set();

  for (const f of files) {
    const src = fs.readFileSync(f, 'utf-8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('#[cfg(test)]') || line.trim().startsWith('//')) continue;
      // 进入 test 模块后跳过（简化：后续 test mod 内定义不统计）
      if (/\bmod tests\b/.test(line) || /\b#\[cfg\(test\)\]/.test(line)) { /* 跳过后续（粗略） */ }
      const m = line.match(/pub (enum|struct)\s+(\w+Error)/);
      if (m) {
        const name = m[2];
        if (!errorTypes[name]) errorTypes[name] = { file: f.replace(`${ROOT}/`, ''), kind: m[1], line: i + 1 };
      }
      const b = line.match(/From<(\w+Error)>\s+for\s+(?:topems_shared_core::error::|crate::error::)?TopemsError/);
      if (b) bridged.add(b[1]);
    }
  }
  return { errorTypes, bridged };
}

function loadAllowlist() {
  try {
    return JSON.parse(fs.readFileSync(ALLOWLIST_FILE, 'utf-8'));
  } catch {
    return { exempt: {} };
  }
}

// -----------------------------------------------------------------------------
// 主流程
// -----------------------------------------------------------------------------
function main() {
  const { errorTypes, bridged } = scan();
  const allow = loadAllowlist();
  const exempt = allow.exempt || {};

  const missing = [];
  for (const [name, info] of Object.entries(errorTypes)) {
    if (bridged.has(name)) continue;
    if (exempt[name]) continue;
    missing.push({ name, ...info });
  }

  // --changed-only：只报告本次改动新增的错误类型
  let changedNames = null;
  if (CHANGED_ONLY) {
    try {
      const diff = execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: ROOT, encoding: 'utf-8' });
      const changedFiles = new Set(diff.split('\n').filter(Boolean));
      changedNames = new Set(
        Object.entries(errorTypes)
          .filter(([, info]) => changedFiles.has(info.file))
          .map(([n]) => n)
      );
    } catch { changedNames = null; }
  }

  const filtered = changedNames
    ? missing.filter((m) => changedNames.has(m.name))
    : missing;

  console.log(`[check-bridge-coverage] 错误类型 ${Object.keys(errorTypes).length}，桥接 ${bridged.size}，缺口 ${missing.length}${CHANGED_ONLY ? `（本次改动新增缺口 ${filtered.length}）` : ''}`);

  for (const m of missing) {
    console.log(`  ❌ ${m.name} (${m.file}:${m.line}) — 缺 impl From<${m.name}> for TopemsError`);
  }
  if (missing.length === 0) {
    console.log('  ✅ 桥接网完备（传播型错误全量覆盖）');
  }

  // 退出码：strict 或 changed-only 命中即失败；全量报告仅提示
  if (STRICT && missing.length > 0) process.exit(1);
  if (CHANGED_ONLY && filtered.length > 0) process.exit(1);
}

main();
