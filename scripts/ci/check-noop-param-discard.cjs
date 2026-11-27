#!/usr/bin/env node
/**
 * Gate · 入参丢弃型桩（假通过）检查
 * =============================================================================
 * 背景（2026-11-27 B368）：finance 里三个端点回「成功」但什么都没做，
 * 写法完全一致——把函数入参 `let _ = x;` 丢掉，然后返回成功：
 *
 *   1. risk_v54::evaluate_rule 恒 true → 每条合规规则都判「通过」并落库
 *   2. payment_record::write_off_payment 丢掉 payable_id/write_off_amount
 *      → 只改付款记录状态就回「核销成功」，应付一分未减
 *   3. u8_import::import_single_voucher 空实现 Ok(())
 *      → 100 张凭证全计入 success_count，库里 0 行
 *
 * 这类写法比直接 501 更危险：调用方拿到 2xx，账与审计记录已经是错的。
 * 规则：生产代码（svc/lib 的 src，`#[cfg(test)]` 段之前）不允许
 *       `let _ = <纯小写标识符>;` 单独成句。
 * 合法写法：改参数名为 `_name`，或 `let _ = expr.await;` 这种带表达式调用的丢弃。
 *
 * 用法：
 *   node scripts/ci/check-noop-param-discard.cjs                  # 全量报告，不失败
 *   node scripts/ci/check-noop-param-discard.cjs --changed-only   # CI：只拦本次改动新增
 *   node scripts/ci/check-noop-param-discard.cjs --strict         # 任何命中即失败
 * =============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SKIP_DIRS = new Set(['target', 'node_modules', '.git', '_archive', '.sqlx', 'dist', 'tests', 'examples']);

// 行级形态：let _ = ident;  （ident 只允许小写/数字/下划线，排除 `let _ = foo();` / `let _ = a.b;`）
const DISCARD_RX = /^[ \t]*let _ = ([a-z][a-z0-9_]*)[ \t]*;[ \t]*$/gm;

const args = new Set(process.argv.slice(2));
const CHANGED_ONLY = args.has('--changed-only');
const STRICT = args.has('--strict');

function* walkRustFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) yield* walkRustFiles(full);
    } else if (ent.name.endsWith('.rs')) {
      yield full;
    }
  }
}

/** 测试段之前的生产代码（测试里的 `let _ =` 允许）。 */
function productionPart(content) {
  const idx = content.indexOf('#[cfg(test)]');
  return idx < 0 ? content : content.slice(0, idx);
}

function scan() {
  const hits = [];
  const byService = {};
  for (const base of ['svc', 'lib']) {
    for (const file of walkRustFiles(path.join(ROOT, base))) {
      let content;
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const body = productionPart(content);
      DISCARD_RX.lastIndex = 0;
      let m;
      while ((m = DISCARD_RX.exec(body)) !== null) {
        const rel = path.relative(ROOT, file);
        const line = body.slice(0, m.index).split('\n').length;
        hits.push({ file: rel, line, ident: m[1] });
        const svc = rel.startsWith('svc/') ? rel.split(path.sep)[1] : `lib/${rel.split(path.sep)[1]}`;
        byService[svc] = (byService[svc] || 0) + 1;
      }
    }
  }
  return { hits, byService };
}

/** 相对 origin/main 合并基点的改动文件（无法取 diff 时返回 null）。 */
function changedFiles() {
  let base = 'HEAD';
  try {
    base =
      execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
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

function main() {
  const { hits, byService } = scan();
  let shown = hits;
  let modeLabel = '全量';

  if (CHANGED_ONLY) {
    const files = changedFiles();
    if (files) {
      shown = hits.filter((h) => files.has(h.file));
      modeLabel = '仅本次改动文件';
    } else {
      modeLabel = '全量（无法获取 git diff，降级）';
    }
  }

  console.log('\n=== 入参丢弃型桩检查（B368）===');
  console.log(`模式：${modeLabel}`);
  console.log(`全仓存量：${hits.length} 处 / ${new Set(hits.map((h) => h.file)).size} 个文件`);
  const ranked = Object.entries(byService).sort((a, b) => b[1] - a[1]);
  for (const [svc, n] of ranked.slice(0, 10)) console.log(`  ${String(n).padStart(4)}  ${svc}`);

  if (shown.length) {
    console.log(`\n--- 命中明细（${shown.length} 处）---`);
    for (const h of shown.slice(0, 30)) console.log(`  ${h.file}:${h.line}  let _ = ${h.ident};`);
    if (shown.length > 30) console.log(`  ... 其余 ${shown.length - 30} 处省略`);
    console.log('\n  处理方式：要么真的实现（让入参参与逻辑），要么显形为未实现（503 + 说明），');
    console.log('  或把参数改名为 _name 表示「刻意不用」。不要让端点回 2xx 却什么都没做。');
  } else {
    console.log('\n✅ 未发现命中。');
  }
  console.log('');

  if (STRICT && hits.length > 0) process.exit(1);
  if (CHANGED_ONLY && shown.length > 0) {
    console.log(`❌ 本次改动新增 ${shown.length} 处「丢弃入参后返回成功」的桩写法。\n`);
    process.exit(1);
  }
  process.exit(0);
}

main();
