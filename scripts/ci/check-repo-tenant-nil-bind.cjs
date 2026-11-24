#!/usr/bin/env node
/**
 * check-repo-tenant-nil-bind.cjs — 仓库写路径禁止 nil 租户绑定（阻断式）
 *
 * 背景：2026-11-19 夜间门禁首跑暴露——`svc/rd` 的 `project_repository` create /
 * batch_create 把 `tenant_id` 硬编码为 `Uuid::nil()`，RLS 强制下写入直接被策略拒绝；
 * 生产侧因应用角色仍是超级用户暂时掩盖了该缺陷。仓库层写/读方法必须显式接收
 * `tenant_id`，nil 在入库前就应被守卫拒绝。
 *
 * 规则：扫描 `svc/<svc>/src/repositories/**.rs`，凡出现 `.bind(Uuid::nil())` 即失败。
 * 模型结构体默认值里的 `Uuid::nil()` 不在 repositories 目录，不受本守卫约束；
 * 测试代码（`tests/`、`*_test.rs`，以及文件内 `#[cfg(test)]` 模块）不纳入扫描。
 *
 * 用法：
 *   node scripts/ci/check-repo-tenant-nil-bind.cjs            # 全量扫描
 *   node scripts/ci/check-repo-tenant-nil-bind.cjs --changed-only
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const REPO_DIR = /[\\/]repositories[\\/]/;
const TEST_PATH = /(^|\/)(tests?|examples|benches)(\/|$)|_test\.rs$|_tests\.rs$/;
const BIND_NIL = /\.bind\s*\(\s*(uuid::)?Uuid::nil\s*\(\s*\)\s*\)/;

function listFiles() {
  const changedOnly = process.argv.includes('--changed-only');
  if (changedOnly) {
    try {
      const out = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
      return out.split('\n').map((f) => f.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  const files = [];
  const svcRoot = path.join(ROOT, 'svc');
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.rs')) files.push(full);
    }
  };
  walk(svcRoot);
  return files;
}

function scanFile(file) {
  const rel = path.relative(ROOT, file);
  if (TEST_PATH.test(rel)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const hits = [];
  let inTestModule = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/#\[cfg\(test\)\]/.test(line)) inTestModule = true;
    if (inTestModule) continue;
    if (BIND_NIL.test(line)) hits.push(`${rel}:${i + 1}: .bind(Uuid::nil()) 禁止出现在仓库层绑定位置`);
  }
  return hits;
}

const hits = [];
for (const file of listFiles()) {
  if (!REPO_DIR.test(file)) continue;
  hits.push(...scanFile(file));
}

if (hits.length > 0) {
  console.error('✗ 仓库层出现 nil 租户绑定（必须显式接收并校验 tenant_id）：');
  for (const h of hits) console.error(`  ${h}`);
  console.error('说明：写/读方法应从 claims/GUC 取租户；nil 只能作为显式平台/系统通道常量使用。');
  process.exit(1);
}

console.log('PASS: 仓库层无 nil 租户绑定');
