#!/usr/bin/env node
/**
 * search_path 环境变量门禁（TODO §1.B W2-A1/W2-A3 的机械断言）
 *
 * 规则：Rust 源码中禁止读写进程级 `SEARCH_PATH` 环境变量。
 *   - 读：`env::var("SEARCH_PATH")` / `std::env::var("SEARCH_PATH")`
 *   - 写：`env::set_var("SEARCH_PATH", ...)` / `env::remove_var("SEARCH_PATH")`
 *
 * 背景：模块 schema 作用域必须显式声明（`bootstrap_service_with_search_path(&config,
 * "<module path>")`，事务内再由 `Db::new(pool, path)` 注入）。靠进程级 SEARCH_PATH
 * 传参会在模块化单体内互相覆盖（后 build 的模块盖掉先 build 的），让裸表名解析
 * 变成启动顺序的函数——历史上正是 500 与「读到错误 schema 同名表」的根因。
 *
 * 零容忍：无基线。出现即阻断，必须改成显式参数。
 *
 * 用法：
 *   node scripts/ci/check-search-path-env.mjs                # 全量
 *   node scripts/ci/check-search-path-env.mjs --changed-only # 仅暂存文件
 *   node scripts/ci/check-search-path-env.mjs --root <dir>   # 指定扫描根（自测用）
 *
 * 退出码：0 通过；1 存在违规。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const changedOnly = args.includes('--changed-only');
const rootArgIndex = args.indexOf('--root');
const scanRoot =
  rootArgIndex >= 0 && args[rootArgIndex + 1]
    ? path.resolve(args[rootArgIndex + 1])
    : repoRoot;

const SKIP_DIRS = new Set(['target', 'node_modules', '.git', 'vendor', 'dist', 'build']);

const PATTERNS = [
  // 只抓环境变量字面量；`SEARCH_PATH` 作为标识符/注释/文档提及不算
  /(?:std::)?env::var(?:_os)?\(\s*"SEARCH_PATH"/,
  /(?:std::)?env::set_var\(\s*"SEARCH_PATH"/,
  /(?:std::)?env::remove_var\(\s*"SEARCH_PATH"/,
];

function listRustFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      listRustFiles(path.join(dir, entry.name), acc);
    } else if (entry.name.endsWith('.rs')) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

function stagedRustFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: repoRoot })
    .toString()
    .split('\n')
    .filter((f) => f.endsWith('.rs') && fs.existsSync(path.join(repoRoot, f)));
  return out.map((f) => path.join(repoRoot, f));
}

const files = changedOnly ? stagedRustFiles() : listRustFiles(scanRoot);
const hits = [];

for (const file of files) {
  const rel = path.relative(repoRoot, file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const re of PATTERNS) {
      if (re.test(line)) {
        hits.push(`${rel}:${i + 1}: ${line.trim()}`);
        break;
      }
    }
  });
}

if (hits.length > 0) {
  console.error(`[search-path-env] FAIL 扫描 ${files.length} 个 Rust 文件，违规 ${hits.length} 处：`);
  for (const h of hits) console.error(`  ${h}`);
  console.error(
    '修复：改用 bootstrap_service_with_search_path(&config, "<module path>")，' +
      '模块作用域由 Db::new(pool, path) 在事务内注入；禁止靠进程级 SEARCH_PATH 传参。'
  );
  process.exit(1);
}

console.log(`[search-path-env] OK 扫描 ${files.length} 个 Rust 文件，SEARCH_PATH 环境读写 0 处`);
