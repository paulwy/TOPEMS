#!/usr/bin/env node
/**
 * scripts/ci/check-prod-migration-entry.mjs
 *
 * prod 迁移入口硬编码扫描（prod 误跑防线之三的补充层）。
 *
 * 规则（命中即阻断）：
 *   1) 同一行同时出现 `sqlx migrate run` 与 prod 标识（topems_prod / 192.168.110.115 /
 *      xingzhai / PROD[_A-Z]*）——即硬编码 prod DSN 直接调用 sqlx；
 *   2) 路径含 prod/production 的脚本中出现 `sqlx migrate run`——即 prod 部署脚本绕过
 *      apply-forward.sh（唯一入口）。
 *   纯注释行 / 文档（.md）不参与扫描。
 *
 * 用法：
 *   node scripts/ci/check-prod-migration-entry.mjs
 *   node scripts/ci/check-prod-migration-entry.mjs --json
 */

import { readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const EXT_RE = /\.(sh|bash|zsh|yml|yaml|toml|rs|mjs|cjs|js|py)$/;
const SCAN_DIRS = ['scripts', '.github', 'database', 'deploy', 'config', 'svc', 'lib'];
const SQLX_RE = /sqlx\s+migrate\s+run/;
const PROD_LINE_RE = /topems_prod|192\.168\.110\.115|xingzhai|\$PROD(_[A-Z0-9_]+)?|PROD_[A-Z0-9_]+/;
// 仅对「名字含 prod/production 的 shell 脚本」启用绕过判定（避免把检查脚本自身、文档、yml 误伤）
const PROD_PATH_RE = /(^|\/)[^/]*(?:prod|production)[^/]*\.(sh|bash|zsh)$/i;
const SELF_PATH_RE = /^scripts\/ci\/check-prod-migration-entry\.mjs$/;
const COMMENT_RE = /^\s*(#|\/\/|\*|--)/;
// 纯消息输出行（echo/warn/info/printf）中的提示文字不算执行入口
const MESSAGE_RE = /^\s*(echo|printf|warn|info|error|log_[a-z_]+|log_[A-Z_]+|die|fail)\b/;

// 已知豁免：需带原因与退出条件，避免白名单腐化。
// 2026-11-05：production-deploy.sh 已切换到 apply-forward.sh，豁免移除；当前无豁免项。
const ALLOWLIST = new Map();

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');

function trackedFiles() {
  try {
    const out = execSync('git ls-files', { encoding: 'utf-8', cwd: ROOT, stdio: ['pipe', 'pipe', 'ignore'] });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

const files = trackedFiles().filter(
  (f) => EXT_RE.test(f) && SCAN_DIRS.some((d) => f.startsWith(d + '/')) && !f.includes('node_modules/')
);

const findings = [];
const allowlisted = [];
for (const rel of files) {
  if (SELF_PATH_RE.test(rel)) continue; // 检查脚本自身的提示文案不自检
  const abs = join(ROOT, rel);
  if (!statSync(abs, { throwIfNoEntry: false })) continue;
  let text;
  try {
    text = readFileSync(abs, 'utf-8');
  } catch {
    continue;
  }
  const lines = text.split('\n');
  const pathIsProd = PROD_PATH_RE.test(rel);
  lines.forEach((line, idx) => {
    if (!SQLX_RE.test(line) || COMMENT_RE.test(line) || MESSAGE_RE.test(line)) return;
    const hardcodedProdDsn = PROD_LINE_RE.test(line);
    const prodScript = pathIsProd;
    if (!hardcodedProdDsn && !prodScript) return;
    const finding = {
      file: rel,
      line: idx + 1,
      rule: hardcodedProdDsn ? 'hardcoded-prod-dsn' : 'prod-script-bypass',
      snippet: line.trim().slice(0, 160),
    };
    if (ALLOWLIST.has(rel)) {
      allowlisted.push({ ...finding, reason: ALLOWLIST.get(rel) });
    } else {
      findings.push(finding);
    }
  });
}

const pass = findings.length === 0;
if (JSON_MODE) {
  console.log(JSON.stringify({ pass, scanned: files.length, findings, allowlisted }, null, 2));
} else {
  console.log(`\
Prod migration entry gate
---------------------------
扫描文件            : ${files.length}
命中硬编码/绕过入口 : ${findings.length}
已知豁免            : ${allowlisted.length}
`);
  for (const f of findings) {
    console.log(`  ❌ ${f.file}:${f.line} [${f.rule}] ${f.snippet}`);
  }
  for (const a of allowlisted) {
    console.log(`  ⚠️  ${a.file}:${a.line} 已豁免 — ${a.reason}`);
  }
  console.log(pass ? 'PASS.' : `FAIL: ${findings.length} 处绕过 apply-forward.sh 的 prod 迁移入口。`);
  console.log('提示：prod 迁移唯一入口是 scripts/migration/apply-forward.sh --prod；禁止 sqlx migrate run。');
}

process.exit(pass ? 0 : 1);
