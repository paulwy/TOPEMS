#!/usr/bin/env node
/**
 * 测试 `#[ignore]` 原因门禁（TODO §1.C C1）
 *
 * 规则：Rust 源码中不允许出现裸 `#[ignore]`——必须写成
 *   `#[ignore = "<原因>"]`
 * 原因要说明「缺什么才能跑」（服务 / 数据库 / 平台），否则半年后没人知道
 * 这条用例是该修还是该删。
 *
 * 零容忍、无基线。注释里出现 `#[ignore]` 不算违规（只判定独立注解行）。
 *
 * 用法：
 *   node scripts/ci/check-test-ignore-reason.mjs                 # 全量
 *   node scripts/ci/check-test-ignore-reason.mjs --changed-only  # 仅暂存文件
 *   node scripts/ci/check-test-ignore-reason.mjs --root <dir>    # 自测用
 *
 * 退出码：0 通过；1 存在裸 `#[ignore]`。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const changedOnly = args.includes('--changed-only');
const rootIdx = args.indexOf('--root');
const scanRoot = rootIdx >= 0 && args[rootIdx + 1] ? path.resolve(args[rootIdx + 1]) : repoRoot;

const SKIP_DIRS = new Set(['target', 'node_modules', '.git', 'vendor', 'dist', 'build']);
const BARE = /^\s*#\[ignore\]\s*$/;

function listRust(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      listRust(path.join(dir, e.name), acc);
    } else if (e.name.endsWith('.rs')) acc.push(path.join(dir, e.name));
  }
  return acc;
}

function staged() {
  return execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: repoRoot })
    .toString()
    .split('\n')
    .filter((f) => f.endsWith('.rs') && fs.existsSync(path.join(repoRoot, f)))
    .map((f) => path.join(repoRoot, f));
}

const files = changedOnly ? staged() : listRust(scanRoot);
const hits = [];
let annotated = 0;

for (const file of files) {
  const rel = path.relative(repoRoot, file);
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (BARE.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
      else if (/^\s*#\[ignore\s*=/.test(line)) annotated += 1;
    });
}

if (hits.length > 0) {
  console.error(`[ignore-reason] FAIL 扫描 ${files.length} 个 Rust 文件，裸 #[ignore] ${hits.length} 处：`);
  for (const h of hits) console.error(`  ${h}`);
  console.error('修复：写成 #[ignore = "<缺什么才能跑>（服务/数据库/平台）"]；确认已失效的直接删除用例。');
  process.exit(1);
}

console.log(
  `[ignore-reason] OK 扫描 ${files.length} 个 Rust 文件，裸 #[ignore] 0 处（已有原因 ${annotated} 处）`
);
