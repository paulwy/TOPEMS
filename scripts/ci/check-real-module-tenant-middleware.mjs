#!/usr/bin/env node
/**
 * [Gate RMT] real_module 租户中间件静态门禁
 *
 * 背景（2026-11-21 B1 回归）：
 *   svc/analytics 的 open_write_scope 改为「租户写入必须复用请求事务」后，
 *   handler 依赖 tenant_middleware 注入的 RlsTxnCell。模块化单体
 *   svc/server/src/modules/analytics_real_module.rs 只挂了 auth_middleware，
 *   导致 28 个 BI 写端点在提取阶段直接 500。
 *
 * 规则（扫描 svc/server/src/modules/*_real_module.rs）：
 *   R1  文件挂了 auth_middleware（或 jwt_auth_middleware），就必须同时挂
 *       tenant_middleware；否则内层 handler 拿不到 RlsTxnCell / 租户 GUC。
 *   R2  两者都挂时，tenant_middleware 必须出现在 auth_middleware 之前
 *       （axum 后挂的 .layer 在外层：认证在外、请求事务在内）。
 *
 * 既存例外登记在 scripts/ci/real-module-tenant-baseline.json：
 *   - delegated：tenant 中间件由被嵌入 crate 的路由构造器内部挂载；
 *   - no_txn：确属自开事务的通道（EHS，§17.2 B 类），显式登记而非静默放过。
 * 例外文件一旦修复（本地出现 tenant_middleware），基线条目即视为陈旧并失败，
 * 必须同步核销；新增违例不得追加基线。
 *
 * 用法：
 *   node scripts/ci/check-real-module-tenant-middleware.mjs
 *   node scripts/ci/check-real-module-tenant-middleware.mjs --dir=<dir> --baseline=<json>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARGS = process.argv.slice(2);

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const hit = ARGS.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const SCAN_DIR = path.resolve(ROOT, argValue('--dir', 'svc/server/src/modules'));
const BASELINE_PATH = path.resolve(
  ROOT,
  argValue('--baseline', 'scripts/ci/real-module-tenant-baseline.json'),
);

const MIN_SCANNED_FILES = 10;

// `_` 是单词字符，因此 \b 天然排除 tenant_middleware_no_txn / jwt_auth_middleware 的误命中。
const AUTH_RE = /\bauth_middleware\b/;
const JWT_AUTH_RE = /\bjwt_auth_middleware\b/;
const TENANT_RE = /\btenant_middleware\b/;
const NO_TXN_RE = /\btenant_middleware_no_txn\b/;

function stripRustComments(text) {
  const out = [];
  let i = 0;
  let inBlock = false;
  let inStr = false;
  let strCh = '';
  while (i < text.length) {
    const ch = text[i];
    const nx = text[i + 1];
    if (inStr) {
      out.push(ch);
      if (ch === '\\') {
        out.push(nx || '');
        i += 2;
        continue;
      }
      if (ch === strCh) inStr = false;
      i++;
      continue;
    }
    if (!inBlock && (ch === '"' || ch === "'")) {
      inStr = true;
      strCh = ch;
      out.push(ch);
      i++;
      continue;
    }
    if (inBlock) {
      if (ch === '*' && nx === '/') {
        inBlock = false;
        out.push('  ');
        i += 2;
        continue;
      }
      out.push(ch === '\n' ? '\n' : ' ');
      i++;
      continue;
    }
    if (ch === '/' && nx === '*') {
      inBlock = true;
      out.push('  ');
      i += 2;
      continue;
    }
    if (ch === '/' && nx === '/') {
      while (i < text.length && text[i] !== '\n') {
        out.push(' ');
        i++;
      }
      continue;
    }
    out.push(ch);
    i++;
  }
  return out.join('');
}

function firstIndex(re, text) {
  const m = re.exec(text);
  return m ? m.index : -1;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    return { error: `基线文件不存在：${path.relative(ROOT, BASELINE_PATH)}` };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    const list = Array.isArray(raw.exceptions) ? raw.exceptions : [];
    return { entries: list };
  } catch (err) {
    return { error: `基线 JSON 解析失败：${err.message}` };
  }
}

function main() {
  if (!fs.existsSync(SCAN_DIR) || !fs.statSync(SCAN_DIR).isDirectory()) {
    console.error(`[Gate RMT] FAIL 扫描目录不存在：${SCAN_DIR}`);
    process.exit(1);
  }

  const baselineResult = loadBaseline();
  if (baselineResult.error) {
    console.error(`[Gate RMT] FAIL ${baselineResult.error}`);
    process.exit(1);
  }
  const baseline = new Map(
    baselineResult.entries.map((e) => [path.normalize(e.file), e]),
  );

  const files = fs
    .readdirSync(SCAN_DIR)
    .filter((name) => name.endsWith('_real_module.rs'))
    .sort();

  if (files.length < MIN_SCANNED_FILES) {
    console.error(
      `[Gate RMT] FAIL 扫描覆盖不足：仅发现 ${files.length} 个 *_real_module.rs（期望 ≥ ${MIN_SCANNED_FILES}），扫描器可能失效。`,
    );
    process.exit(1);
  }

  const failures = [];
  const seenBaseline = new Set();
  let withAuth = 0;
  let withTenant = 0;
  let withNoTxn = 0;

  for (const name of files) {
    const abs = path.join(SCAN_DIR, name);
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const clean = stripRustComments(fs.readFileSync(abs, 'utf8'));

    const authIdx = Math.max(firstIndex(AUTH_RE, clean), firstIndex(JWT_AUTH_RE, clean));
    const tenantIdx = firstIndex(TENANT_RE, clean);
    const noTxnIdx = firstIndex(NO_TXN_RE, clean);

    if (authIdx === -1) continue;
    withAuth++;
    if (tenantIdx !== -1) withTenant++;
    if (noTxnIdx !== -1) withNoTxn++;

    if (tenantIdx === -1) {
      const entry = baseline.get(path.normalize(rel));
      if (entry) {
        seenBaseline.add(path.normalize(rel));
        continue;
      }
      failures.push({
        file: rel,
        rule: 'R1',
        msg: noTxnIdx !== -1
          ? '只挂了 tenant_middleware_no_txn，未挂 tenant_middleware（handler 无法复用请求事务）'
          : '挂了 auth_middleware 但缺少 tenant_middleware（handler 拿不到 RlsTxnCell）',
      });
      continue;
    }

    if (tenantIdx > authIdx) {
      failures.push({
        file: rel,
        rule: 'R2',
        msg: `层序错误：tenant_middleware 位于 auth_middleware 之后（tenant@${tenantIdx}, auth@${authIdx}）。` +
          'axum 后挂的 .layer 在外层，应保持认证在外、请求事务在内。',
      });
    }
  }

  // 基线陈旧：文件已修复 / 已删除 / 不再命中 auth-only，必须核销。
  for (const [file, entry] of baseline) {
    if (!seenBaseline.has(file)) {
      failures.push({
        file,
        rule: 'BASELINE_STALE',
        msg: `基线条目已失效（文件已修复、已删除或不再命中 R1），请从 ${path.relative(ROOT, BASELINE_PATH)} 移除。` +
          (entry.reason ? ` 原登记原因：${entry.reason}` : ''),
      });
    }
  }

  console.log('='.repeat(72));
  console.log('  [Gate RMT] REAL MODULE TENANT MIDDLEWARE CHECK');
  console.log('='.repeat(72));
  console.log(`  Scan dir        : ${path.relative(ROOT, SCAN_DIR)}`);
  console.log(`  Baseline        : ${path.relative(ROOT, BASELINE_PATH)}`);
  console.log(`  Scanned files   : ${files.length}`);
  console.log(`  With auth       : ${withAuth}`);
  console.log(`  With tenant     : ${withTenant}`);
  console.log(`  With no_txn     : ${withNoTxn}`);
  console.log(`  Baseline entries: ${baseline.size} (matched ${seenBaseline.size})`);

  if (failures.length === 0) {
    console.log('  Result          : ✅ PASS（无新增漏挂，基线全部命中）');
    console.log('='.repeat(72));
    return;
  }

  console.log(`  Result          : ❌ FAIL（${failures.length} 项）`);
  for (const f of failures) {
    console.log(`    [${f.rule}] ${f.file}`);
    console.log(`      → ${f.msg}`);
  }
  console.log('='.repeat(72));
  process.exit(1);
}

main();
