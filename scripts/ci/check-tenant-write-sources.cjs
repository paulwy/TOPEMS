#!/usr/bin/env node
/**
 * 零租户写入源头扫描（WRITE 阻断；读侧两类永久 report-only）
 *
 * 背景：业务写入必须以 claims/GUC 租户落库，零 UUID
 * （00000000-0000-0000-0000-000000000000）只能作为「平台通道」显式常量使用。
 *
 * 判定规则（分三类，避免把读侧守卫混进写源）：
 * 1. WRITE（写源疑似，阻断口径）：零 UUID 出现在 INSERT/UPDATE/DELETE 的 tenant
 *    绑定位置；关联口径：先看绑定行 ±6 行局部窗口，再回退到所在函数体做语句级关联
 *    （写 SQL 与 .bind 相距较远时不再漏判）；另补「局部变量先兜底 nil、落库时直绑
 *    该变量」的绑定侧关联。事件负载/外键/操作人 ID 的 parse 兜底不计入。
 * 2. READ-GUARD（读侧隐式全局）：`OR tenant_id` / `tenant_id IS NULL` /
 *    `NULLIF(NULLIF(current_setting('app.tenant_id'...` 等谓词里的零 UUID；
 * 3. IMPLICIT-GLOBAL（读侧隐式全局）：`$N::uuid IS NULL OR tenant_id`、
 *    `OR tenant_id IS NULL` 等不带零 UUID 字面量的隐式全局谓词。超管/服务令牌
 *    跨租户读必须走系统作用域（`scope_system` / `scope_read_system` /
 *    `scope_read_platform`），不得在 SQL 里自己写可选租户谓词。
 *
 * 口径拍板（2026-11-24）：WRITE 写源纳入 --strict 阻断；READ-GUARD 与
 * IMPLICIT-GLOBAL 属读侧设计问题，永久 report-only，走系统作用域收敛专项治理，
 * 不混进写源门禁阻断。
 *
 * 白名单（不报告）：
 * - 显式常量 PLATFORM_TENANT_ID / SYSTEM_TENANT_ID
 * - 测试代码（tests/、examples/、benches/、*_test.rs）
 * - 本脚本自身
 * - 同行或上一行带 `// tenant-system: <原因>` 的显式系统通道写入
 * - 同行或上一行带 `// tenant-event: <原因>` 的事件负载字段（非落库绑定）
 * - SELECT/RETURNING 投影里的 COALESCE(tenant_id, nil)、结构体/DTO 字段默认值
 *
 * 默认 report-only：始终 exit 0；传入 --strict 时仅在 WRITE 命中时非零退出阻断，
 * READ-GUARD / IMPLICIT-GLOBAL 命中不影响退出码。
 *
 * 用法：
 *   node scripts/ci/check-tenant-write-sources.cjs --changed-only
 *   node scripts/ci/check-tenant-write-sources.cjs            # 全量扫描
 *   node scripts/ci/check-tenant-write-sources.cjs --strict   # WRITE 阻断模式
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOTS = ['svc', 'lib', 'scripts'];
const EXTS = new Set(['.rs', '.sql']);
const NIL_LITERAL = '00000000-0000-0000-0000-000000000000';
const EXPLICIT_CONST = /PLATFORM_TENANT_ID|SYSTEM_TENANT_ID/;
const TENANT_HINT = /tenant/i;
const SQL_WRITE = /\b(INSERT\s+INTO|UPDATE\s+\w+\.\w+|DELETE\s+FROM)\b/i;
const SQL_WRITE_TENANT = /\b(INSERT\s+INTO|UPDATE\s+\w+\.\w+|DELETE\s+FROM)\b[\s\S]*\btenant_id\b/i;
const READ_GUARD =
  /OR\s+tenant_id|tenant_id\s+IS\s+NULL|NULLIF\(\s*NULLIF\(\s*current_setting\('app\.tenant_id'/i;
const BIND_NIL = /\.bind\s*\(\s*(uuid::)?Uuid::nil\s*\(\s*\)\s*\)/;
const UNWRAP_NIL = /unwrap_or(_else)?\s*\([^)]*Uuid::nil/;
const IMPLICIT_GLOBAL = [
  /\$\d+\s*::uuid\s+IS\s+NULL\s+OR\s+tenant_id/i,
  /\bOR\s+tenant_id\s+IS\s+NULL\b/i,
];
const TEST_PATH = /(^|\/)(tests?|examples|benches)(\/|$)|_test\.rs$|_tests\.rs$/;
// 显式系统通道登记：同一行或上一行带 `// tenant-system: <原因>` 即豁免写源判定。
const SYSTEM_ANNOTATION = /\/\/\s*tenant-system\s*:/;
// 事件负载登记：同一行或上一行带 `// tenant-event: <原因>`，表示该 nil 仅进入
// 事件消息体/外键/操作人字段，并非落库租户绑定，不纳入写源阻断。
const EVENT_ANNOTATION = /\/\/\s*tenant-event\s*:/;
function hasSystemAnnotation(lines, idx) {
  const here = lines[idx];
  const prev = idx > 0 ? lines[idx - 1] : '';
  return SYSTEM_ANNOTATION.test(here) || SYSTEM_ANNOTATION.test(prev)
    || EVENT_ANNOTATION.test(here) || EVENT_ANNOTATION.test(prev);
}
// 运维/回填/清理/演练语料：允许显式以 nil 做标记、回滚与校验，不纳入写源阻断
const OPS_SCRIPT = /^scripts\/(ops|db\/sql)\//;
const SELF = 'scripts/ci/check-tenant-write-sources.cjs';

function listFiles(changedOnly) {
  if (changedOnly) {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
    });
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((f) => ROOTS.some((r) => f.startsWith(`${r}/`)))
      .filter((f) => EXTS.has(path.extname(f)));
  }
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['target', 'node_modules', '.git'].includes(entry.name)) continue;
        walk(full);
      } else if (EXTS.has(path.extname(entry.name))) {
        files.push(full);
      }
    }
  };
  for (const root of ROOTS) {
    if (fs.existsSync(root)) walk(root);
  }
  return files;
}

// 按函数边界把源码切成 span，便于把“落库绑定”与同函数体内的写 SQL
// 关联起来（此前仅看绑定行 ±6 行窗口，INSERT/UPDATE 与 .bind 相距较远时会漏判）。
function functionSpans(lines) {
  const declRe = /(?:pub\s+)?(?:async\s+)?fn\s+\w+/;
  const starts = [];
  lines.forEach((l, i) => {
    if (declRe.test(l)) starts.push(i);
  });
  const spans = [];
  starts.forEach((s, k) => {
    const e = k + 1 < starts.length ? starts[k + 1] : lines.length;
    spans.push({ start: s, end: e, body: lines.slice(s, e).join('\n') });
  });
  return spans;
}

function enclosingSpan(spans, idx) {
  for (const sp of spans) {
    if (idx >= sp.start && idx < sp.end) return sp;
  }
  return null;
}

function scanFile(file) {
  const hits = { write: [], readGuard: [], implicitGlobal: [] };
  if (file === SELF || TEST_PATH.test(file) || OPS_SCRIPT.test(file)) return hits;
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  // 函数体内先声明局部变量并兜底 nil，随后在写 SQL 绑定处直绑该变量
  // （如 `let tenant_uuid = ...unwrap_or(nil)` → `.bind(tenant_uuid)`），
  // 原语句级关联只看绑定行 nil 字面量会漏判；这里收集这类变量名再在绑定侧命中。
  const nilVars = new Set();
  lines.forEach((l) => {
    const m = l.match(/^\s*(?:let|var)\s+(\w+)\s*=.*unwrap_or(?:_else)?\s*\([^)]*Uuid::nil/);
    if (m) nilVars.add(m[1]);
  });

  const spans = functionSpans(lines);
  lines.forEach((line, idx) => {
    if (IMPLICIT_GLOBAL.some((re) => re.test(line))) {
      hits.implicitGlobal.push({ file, line: idx + 1, text: line.trim() });
    }
    const hasNil =
      line.includes(NIL_LITERAL) || /Uuid::nil\b/.test(line);
    if (!hasNil) return;
    if (EXPLICIT_CONST.test(line)) return;
    if (hasSystemAnnotation(lines, idx)) return;

    // 局部窗口：覆盖多行 SQL 内紧邻的 tenant 字段与绑定。
    const window = lines.slice(Math.max(0, idx - 6), idx + 7).join('\n');

    // 读侧谓词先归位：OR tenant_id / tenant_id IS NULL / NULLIF(current_setting...)
    if (READ_GUARD.test(line) || READ_GUARD.test(window)) {
      hits.readGuard.push({ file, line: idx + 1, text: line.trim() });
      return;
    }

    // SELECT/RETURNING 投影里的 COALESCE(tenant_id, nil) 只是展示兜底，不是写源
    if (/COALESCE\s*\(\s*tenant_id/i.test(line)) {
      return;
    }

    // 结构体/DTO 字段默认值（`tenant_id: Uuid::nil()` / `tenant_id: ...unwrap_or(nil)`），
    // 非写路径绑定，不纳入写源。
    if (/^\s*tenant_id\s*:/.test(line)) {
      return;
    }

    // 写上下文：局部窗口命中 或 所在函数体内出现写 SQL（语句级关联，不再受 6 行窗口限制）。
    const windowWrite = SQL_WRITE.test(window) && TENANT_HINT.test(window);
    const span = enclosingSpan(spans, idx);
    const fnWrite =
      !!span && SQL_WRITE.test(span.body) && TENANT_HINT.test(span.body);
    const writeContext = windowWrite || fnWrite;

    const writeShape = SQL_WRITE_TENANT.test(window) && TENANT_HINT.test(line);

    const hit = { file, line: idx + 1, text: line.trim() };
    // 函数级关联只认行内即租户绑定的 nil 兜底；事件负载/外键/操作人 ID 的
    // parse 兜底（rid/owner_id/approver_uuid/conn_uuid 等）不属写源租户绑定。
    const lineIsTenantBind = TENANT_HINT.test(line);
    if (
      writeContext &&
      lineIsTenantBind &&
      (BIND_NIL.test(line) || UNWRAP_NIL.test(line) || /tenant_id/.test(line))
    ) {
      hits.write.push(hit);
    } else if (writeShape) {
      hits.write.push(hit);
    }

    // 绑定侧关联：局部变量先兜底 nil，落库时 `.bind(<var>)` 引用该变量。
    const bindVar = line.match(/\.bind\s*\(\s*(\w+)\s*\)/);
    if (writeContext && bindVar && nilVars.has(bindVar[1])) {
      hits.write.push(hit);
    }
  });
  return hits;
}

function report(title, hits, printDetail) {
  if (hits.length === 0) return;
  console.log(`${title}: ${hits.length} 处`);
  const byFile = new Map();
  for (const h of hits) byFile.set(h.file, (byFile.get(h.file) || 0) + 1);
  for (const [file, count] of byFile) console.log(`  ${file}: ${count}`);
  if (printDetail) {
    console.log('--- 明细 ---');
    for (const h of hits) console.log(`  ${h.file}:${h.line}: ${h.text}`);
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  const changedOnly = args.has('--changed-only');
  const strict = args.has('--strict');

  const files = listFiles(changedOnly);
  const results = files.map(scanFile);
  const write = results.flatMap((r) => r.write);
  const readGuard = results.flatMap((r) => r.readGuard);
  const implicitGlobal = results.flatMap((r) => r.implicitGlobal);

  const mode = strict ? 'BLOCKING' : 'REPORT-ONLY';
  if (write.length === 0 && readGuard.length === 0 && implicitGlobal.length === 0) {
    console.log(`[Gate TWS] PASS (${mode}) 零租户写入源头扫描无命中（${files.length} 文件）`);
    return;
  }

  console.log(`[Gate TWS] ${mode} 零租户扫描命中（${files.length} 文件）：`);
  report('WRITE 写源疑似', write, true);
  report('READ-GUARD 读侧隐式全局（第二阶段清单）', readGuard, false);
  report('IMPLICIT-GLOBAL 可选租户谓词（始终 report-only）', implicitGlobal, false);
  console.log(
    '说明：平台/系统语料请显式引用 PLATFORM_TENANT_ID / SYSTEM_TENANT_ID 并注明理由；' +
      '业务写入必须使用 claims/GUC 租户；测试代码不纳入扫描。',
  );
  if (strict && write.length > 0) process.exit(1);
}

main();
