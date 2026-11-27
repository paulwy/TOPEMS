#!/usr/bin/env node
/**
 * check-soft-delete-precedence.cjs — 软删谓词 AND/OR 优先级门禁
 *
 * 背景（2026-11-27，B365）：
 *   `svc/unified-core/src/modules/tenant/handlers.rs` 与 `svc/gis/src/modules/location.rs`
 *   写过这样的搜索条件：
 *
 *     WHERE deleted_at IS NULL AND name ILIKE $1 OR code ILIKE $1
 *
 *   SQL 里 AND 比 OR 结合更紧，真实语义是 `(deleted_at IS NULL AND name ILIKE $1) OR code ILIKE $1`，
 *   于是只要 code 命中，软删行照样被返回——软删过滤被 OR 旁路。
 *
 * 规则：同一个 WHERE 子句里，若 `deleted_at IS NULL` 与同层级的 `OR` 共存，即判违规。
 *   - 括号内的 OR（`AND (a OR b)`）不影响软删谓词，不算违规；
 *   - `deleted_at IS NULL` 出现在子查询里时按该子查询自身层级判定。
 *
 * 用法：
 *   node scripts/ci/check-soft-delete-precedence.cjs                # 全仓扫描 svc/ + lib/
 *   node scripts/ci/check-soft-delete-precedence.cjs --changed-only # 只扫 git 暂存区改动的 .rs
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../..');
const SCAN_ROOTS = ['svc', 'lib'];
const CLAUSE_END = /\b(ORDER\s+BY|GROUP\s+BY|LIMIT|OFFSET|RETURNING|FOR\s+UPDATE|UNION)\b/i;

const changedOnly = process.argv.includes('--changed-only');

function listFiles() {
  if (changedOnly) {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.endsWith('.rs'))
      .filter((l) => SCAN_ROOTS.some((r) => l.startsWith(`${r}/`)))
      .map((l) => path.join(REPO_ROOT, l));
  }
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'target' || entry.name.startsWith('.')) continue;
        walk(full);
      } else if (entry.name.endsWith('.rs')) {
        files.push(full);
      }
    }
  };
  for (const root of SCAN_ROOTS) {
    const abs = path.join(REPO_ROOT, root);
    if (fs.existsSync(abs)) walk(abs);
  }
  return files;
}

/** 抽取源码里的字符串字面量（含 r#"..."# 与普通 "..."），返回 {start, body}。 */
function literals(source) {
  const found = [];
  const seen = new Set();
  const patterns = [/r#*"([\s\S]*?)"#*/g, /"((?:[^"\\]|\\.)*)"/g];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(source)) !== null) {
      if (seen.has(m.index)) continue;
      seen.add(m.index);
      found.push({ start: m.index, body: m[1] });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** 判断一个 SQL 字面量是否让软删谓词被同层 OR 旁路。返回违规片段或 null。 */
function violation(body) {
  const tokenRe = /deleted_at\s+IS\s+NULL/gi;
  let t;
  while ((t = tokenRe.exec(body)) !== null) {
    const whereIdx = body.slice(0, t.index).toLowerCase().lastIndexOf('where');
    if (whereIdx < 0) continue;

    // 计算 token 处相对 WHERE 之后的括号深度
    let depth = 0;
    for (const ch of body.slice(whereIdx + 5, t.index)) {
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
    }
    const tokenDepth = depth;

    // 从句尾前扫描同层 OR
    let d = tokenDepth;
    let i = t.index;
    while (i < body.length) {
      const ch = body[i];
      if (ch === '(') d += 1;
      else if (ch === ')') {
        d -= 1;
        if (d < tokenDepth) break;
      }
      if (d === tokenDepth) {
        const rest = body.slice(i);
        if (CLAUSE_END.test(rest.slice(0, 24))) break;
        const orMatch = /^\s+OR\s+/i.exec(rest);
        if (orMatch) {
          return body.slice(whereIdx, Math.min(body.length, i + 24)).replace(/\s+/g, ' ').trim();
        }
      }
      i += 1;
    }
  }
  return null;
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

const violations = [];
for (const file of listFiles()) {
  const source = fs.readFileSync(file, 'utf8');
  if (!/deleted_at\s+IS\s+NULL/i.test(source)) continue;
  for (const lit of literals(source)) {
    if (!/deleted_at\s+IS\s+NULL/i.test(lit.body)) continue;
    const bad = violation(lit.body);
    if (bad) {
      violations.push({
        file: path.relative(REPO_ROOT, file),
        line: lineOf(source, lit.start),
        sql: bad,
      });
    }
  }
}

if (violations.length === 0) {
  console.log('[soft-delete-precedence] OK：未发现软删谓词被同层 OR 旁路的 SQL');
  process.exit(0);
}

console.error('[soft-delete-precedence] 发现软删谓词被 OR 旁路（AND 比 OR 结合更紧）：');
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}`);
  console.error(`    ${v.sql}`);
}
console.error('');
console.error('修法：把 OR 条件整体括起来，例如');
console.error('    WHERE deleted_at IS NULL AND (name ILIKE $1 OR code ILIKE $1)');
process.exit(1);
