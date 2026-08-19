#!/usr/bin/env node
// Axum 中间件层序静态检查（auth_middleware vs tenant_middleware）
//
// 背景：Axum 0.8.x Router.layer() 执行顺序是「最后添加的层 = 最外层 = 最先执行」。
// tenant_middleware 的 extractor 需要 Claims（由 auth_middleware 注入），因此：
//   正确：tenant_middleware 先 .layer()（innermost，后执行），auth_middleware 后 .layer()（outermost，先执行）
//   错误：反过来写会导致 500 "Missing request extension of type Claims"
//
// 用法：
//   node scripts/check-axum-layer-order.cjs                      # DRY-RUN（默认），只扫描不阻塞
//   node scripts/check-axum-layer-order.cjs --fail-fast          # 存在 FAIL 时 exit 1
//   node scripts/check-axum-layer-order.cjs --report-json /tmp/r.json  # 输出 JSON 报告
//
// 退出码：
//   0 = DRY-RUN 或 FAIL=0 或未启用 --fail-fast
//   1 = --fail-fast 启用且 failures.length > 0

const fs = require('fs');
const path = require('path');

const SVC_ROOT = path.resolve(__dirname, '../svc');

// ---------- CLI 参数解析 ----------
function getArgValue(argsList, flag) {
  const eqIdx = argsList.findIndex(a => a.startsWith(flag + '='));
  if (eqIdx !== -1) return argsList[eqIdx].slice(flag.length + 1);
  const spIdx = argsList.indexOf(flag);
  if (spIdx !== -1 && argsList[spIdx + 1]) return argsList[spIdx + 1];
  return null;
}

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--no-dry-run'); // 默认 DRY-RUN
const FAIL_FAST = args.includes('--fail-fast');
const REPORT_JSON_VAL = getArgValue(args, '--report-json');
const REPORT_JSON_PATH = REPORT_JSON_VAL ? path.resolve(REPORT_JSON_VAL) : null;

// ---------- 文件扫描 ----------
function collectRsFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['target', 'node_modules', '.git'].includes(e.name)) continue;
      collectRsFiles(f, out);
    } else if (e.name.endsWith('.rs')) {
      const base = path.basename(f);
      const relDir = path.dirname(path.relative(SVC_ROOT, f));
      const parts = relDir.split(path.sep);
      const svcName = parts[0];
      const fileName = base.toLowerCase();
      if (fileName === 'routes.rs' || fileName === 'main.rs') {
        out.push({ path: f, svc: svcName, priority: 1 });
      } else {
        out.push({ path: f, svc: svcName, priority: 2 });
      }
    }
  }
}

function scanAllFiles() {
  const files = [];
  collectRsFiles(SVC_ROOT, files);
  files.sort((a, b) => a.priority - b.priority || a.path.localeCompare(b.path));
  return files;
}

// ---------- Router 块检测与校验 ----------
// 匹配 auth_middleware 行：from_fn_with_state(..., auth_middleware)
const AUTH_MW_RE = /auth_middleware\s*[,)]/;
// 匹配 tenant_middleware 行：from_fn(middleware::tenant::tenant_middleware) 或类似
const TENANT_MW_RE = /tenant_middleware\s*[,)]/;

// 判断某行是否包含 .with_state(（router 块的结束标记）
function isWithStateEnd(line) {
  return /\.with_state\s*\(/.test(line);
}

// 判断某行是否包含 Router::new(（router 块的开始标记）
function isRouterNew(line) {
  return /Router::new\s*\(/.test(line);
}

function extractSnippet(lines, startIdx, endIdx, contextLines) {
  const snippetStart = Math.max(0, startIdx - contextLines);
  const snippetEnd = Math.min(lines.length, endIdx + contextLines + 1);
  const result = [];
  for (let i = snippetStart; i < snippetEnd; i++) {
    result.push({ line: i + 1, content: lines[i] });
  }
  return result;
}

function analyzeFile(filePath) {
  const relPath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const routers = [];
  const failures = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!isRouterNew(line)) continue;

    const blockStartLine = i + 1;
    const blockStartIdx = i;
    let authLine = -1;
    let tenantLine = -1;
    let withStateIdx = -1;

    let j = i;
    while (j < lines.length) {
      const curLine = lines[j];
      if (AUTH_MW_RE.test(curLine) && authLine === -1) {
        authLine = j + 1;
      }
      if (TENANT_MW_RE.test(curLine) && tenantLine === -1) {
        tenantLine = j + 1;
      }
      if (isWithStateEnd(curLine)) {
        withStateIdx = j;
        break;
      }
      j++;
    }

    if (authLine > 0 && tenantLine > 0) {
      const routerChecked = {
        file: relPath,
        routerStartLine: blockStartLine,
        authLine,
        tenantLine,
      };
      routers.push(routerChecked);
      if (authLine < tenantLine) {
        const snippetStart = Math.min(authLine, tenantLine) - 1;
        const snippetEnd = Math.max(authLine, tenantLine) - 1;
        const endIdx = withStateIdx >= 0 ? withStateIdx : snippetEnd;
        failures.push({
          file: relPath,
          routerStartLine: blockStartLine,
          authLine,
          tenantLine,
          snippet: extractSnippet(lines, snippetStart, endIdx, 2),
          rule: 'R1',
        });
      }
    }

    if (j > i) i = j;
  }

  return { routers, failures };
}

// ---------- 主流程 ----------
function main() {
  const allFiles = scanAllFiles();
  const scannedFiles = allFiles.length;

  let totalRoutersChecked = 0;
  const allFailures = [];

  for (const { path: fp } of allFiles) {
    try {
      const { routers, failures } = analyzeFile(fp);
      totalRoutersChecked += routers.length;
      for (const f of failures) allFailures.push(f);
    } catch (e) {
      // 跳过读取错误的文件
    }
  }

  const failR1 = allFailures.length;
  const warnCount = 0;

  // ---------- 控制台 SUMMARY 输出 ----------
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Axum Layer Order Gate (auth ↔ tenant)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  DRY-RUN       : ${DRY_RUN ? 'ON (exit 0 always)' : 'OFF'}`);
  console.log(`  FAIL-FAST     : ${FAIL_FAST ? 'ON' : 'OFF'}`);
  console.log('');
  console.log('  ── SUMMARY ──');
  console.log(`  SCANNED FILES       : ${scannedFiles}${scannedFiles >= 20 ? ' ✅' : ' ⚠️ (<20)'}`);
  console.log(`  TOTAL ROUTERS CHECKED: ${totalRoutersChecked}`);
  console.log(`  FAIL (R1)           : ${failR1}${failR1 > 0 ? ' ❌' : ' ✅'}`);
  console.log(`  WARN (R2~R6)        : ${warnCount} ✅`);
  console.log('');

  // ---------- FAIL 详情 ----------
  if (failR1 > 0) {
    console.log('  ── FAIL DETAILS (R1: auth_middleware < tenant_middleware) ──');
    console.log('');
    allFailures.forEach((f, idx) => {
      console.log(`  ❌ [${idx + 1}] ${f.file}`);
      console.log(`      Router 块起始行: L${f.routerStartLine}`);
      console.log(`      auth_middleware : L${f.authLine}  (应 > tenant, 实际: ${f.authLine} < ${f.tenantLine})`);
      console.log(`      tenant_middleware: L${f.tenantLine}`);
      console.log(`      代码片段 (±2 行上下文):`);
      f.snippet.forEach((s) => {
        const marker =
          s.line === f.authLine ? ' 🔴 AUTH' :
          s.line === f.tenantLine ? ' 🟡 TENANT' : '';
        const prefix = `        L${String(s.line).padStart(4, ' ')}|`;
        console.log(`${prefix} ${s.content}${marker}`);
      });
      console.log('');
    });

    console.log('  修复建议：');
    console.log('    Axum 规则：最后 .layer() 的 = 最外层 = 最先执行');
    console.log('    正确顺序：先加 tenant_middleware（innermost，后执行），再加 auth_middleware（outermost，先执行）');
    console.log('    即 tenant_middleware 的行号 < auth_middleware 的行号');
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════');

  // ---------- JSON 报告 ----------
  if (REPORT_JSON_PATH) {
    const report = {
      timestamp: new Date().toISOString(),
      scanned: scannedFiles,
      routersChecked: totalRoutersChecked,
      failures: allFailures.map(f => ({
        file: f.file,
        routerStartLine: f.routerStartLine,
        authLine: f.authLine,
        tenantLine: f.tenantLine,
        snippet: f.snippet,
        rule: f.rule,
      })),
    };
    fs.mkdirSync(path.dirname(REPORT_JSON_PATH), { recursive: true });
    fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`  📄 Report JSON -> ${path.relative(process.cwd(), REPORT_JSON_PATH)}`);
    console.log('');
  }

  // ---------- Exit Code ----------
  // 默认 DRY-RUN 一律 0；仅显式 --fail-fast 且 failures.length > 0 时 exit(1)
  if (FAIL_FAST && failR1 > 0) {
    console.error(`\n❌ FAIL-FAST: 检测到 ${failR1} 处层序错误 (R1)，退出码 1`);
    process.exit(1);
  }

  if (!DRY_RUN && failR1 > 0) {
    process.exitCode = 1;
  }
}

main();
