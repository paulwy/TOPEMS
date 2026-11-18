#!/usr/bin/env node
/**
 * scripts/ci/check-no-runtime-permission-insert.mjs
 *
 * 守卫：svc 下的 Rust 源码不得出现「运行期 INSERT INTO core_permissions」。
 *
 * 背景（2026-11-18）：2026-10-26 生产首次启动时，svc/unified-core 的
 * iam::init_database 在运行期自举写入 69 条模块级伞码与 128 条角色绑定，
 * 迁移链从未登记。后果：空库克隆缺码、gen-permissions 与生产差集 61 条，
 * 直到 20261118125000_seed_module_umbrella_permissions.sql 才收编进链。
 * 该自举代码已于 172abd3f8 删除，本守卫防止它（或同类运行期种入）再次回流。
 *
 * 规则：svc/**\/*.rs 任意行命中 /INSERT\s+INTO\s+.*core_permissions/i 即失败。
 * 注释行（// 与 ///、//!）不计——文档里描述禁令不算运行期写入。
 *
 * 用法：
 *   node scripts/ci/check-no-runtime-permission-insert.mjs
 *   node scripts/ci/check-no-runtime-permission-insert.mjs --json
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_ROOT = join(ROOT, 'svc');
const SKIP_DIRS = new Set(['target', 'node_modules', '.git', 'dist']);
const PATTERN = /INSERT\s+INTO\s+.*core_permissions/i;

const JSON_MODE = process.argv.slice(2).includes('--json');
const hits = [];
let scanned = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      const path = join(dir, entry.name);
      scanned += 1;
      const lines = readFileSync(path, 'utf8').split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return; // 注释不计
        if (PATTERN.test(line)) {
          hits.push({ file: relative(ROOT, path), line: idx + 1, text: trimmed.slice(0, 160) });
        }
      });
    }
  }
}

if (statSync(SCAN_ROOT, { throwIfNoEntry: false })) walk(SCAN_ROOT);

const pass = hits.length === 0;
if (JSON_MODE) {
  console.log(JSON.stringify({ pass, scanned, violations: hits }, null, 2));
} else {
  console.log('Runtime permission-seed guard (svc/**/*.rs)');
  console.log('---------------------------');
  console.log(`扫描 .rs 文件      : ${scanned}`);
  console.log(`命中 INSERT core_permissions: ${hits.length}`);
  for (const h of hits) console.log(`  ❌ ${h.file}:${h.line} — ${h.text}`);
  if (!pass) {
    console.log('');
    console.log('权限码只能经 database/migrations 落库（见 20261118125000_seed_module_umbrella_permissions.sql）。');
    console.log('运行期自举会让空库克隆缺码、gen-permissions 与生产漂移，请改为迁移文件。');
  }
  console.log(pass ? 'PASS.' : `FAIL: ${hits.length} 处运行期 INSERT INTO core_permissions。`);
}
process.exit(pass ? 0 : 1);
