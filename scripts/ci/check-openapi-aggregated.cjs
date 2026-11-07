#!/usr/bin/env node
/**
 * check-openapi-aggregated.cjs — 聚合 OpenAPI 产物棘轮门禁（W6-C）
 *
 * 目的：防止「后端路由变更了，但 docs/api/openapi-aggregated.json 没同步重生成」的漂移。
 *
 * 做法：静态抽取 svc/lib 中实际挂载的路由（scripts/dev/extract-live-routes.py，纯正则、无编译），
 *      与聚合产物 paths 求差集，并与基线计数比较：
 *        - missing_in_openapi 只允许下降（代码有、文档无 → 说明产物落后于代码）
 *        - extra_in_openapi   只允许下降（文档有、代码无 → 说明产物含过期路由）
 *      任一方向计数上升即 exit 1，提示运行生成入口：
 *        ./scripts/openapi/generate.sh --extract
 *
 * 为什么用计数基线而不是全量白名单：
 *       当前聚合产物是 2026-09-06 的历史快照（paths 716 / 方法 873），live 已有 3926 个方法，
 *       全量白名单约 4500 条（>200KB），难以审阅。计数棘轮同样能拦截「新增路由未入文档」，
 *       且基线文件很小；后续每完成一批重生成，用 --update-baseline 收紧一次。
 *
 * 用法：
 *   node scripts/ci/check-openapi-aggregated.cjs                 # 门禁（默认阻断）
 *   node scripts/ci/check-openapi-aggregated.cjs --report-only   # 仅报告
 *   node scripts/ci/check-openapi-aggregated.cjs --update-baseline
 *   node scripts/ci/check-openapi-aggregated.cjs --live-csv /tmp/routes.csv
 *   node scripts/ci/check-openapi-aggregated.cjs --aggregated-path /tmp/agg.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../..');
const EXTRACTOR = path.join(REPO_ROOT, 'scripts/dev/extract-live-routes.py');
const DEFAULT_AGGREGATED = path.join(REPO_ROOT, 'docs/api/openapi-aggregated.json');
const DEFAULT_BASELINE = path.join(__dirname, 'openapi-aggregated-baseline.json');

const args = process.argv.slice(2);
let liveCsvPath = null;
let aggregatedPath = DEFAULT_AGGREGATED;
let baselinePath = DEFAULT_BASELINE;
let updateBaseline = false;
let reportOnly = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--live-csv' && args[i + 1]) liveCsvPath = args[++i];
  else if (args[i] === '--aggregated-path' && args[i + 1]) aggregatedPath = args[++i];
  else if (args[i] === '--baseline-path' && args[i + 1]) baselinePath = args[++i];
  else if (args[i] === '--update-baseline') updateBaseline = true;
  else if (args[i] === '--report-only') reportOnly = true;
  else if (args[i] === '--help') {
    console.log('用法: node scripts/ci/check-openapi-aggregated.cjs [--report-only|--update-baseline|--live-csv <path>]');
    process.exit(0);
  }
}

/** 路径参数归一化：{id}/{user_id} → {p}（与 check-openapi-coverage.cjs 同口径） */
function normalizePath(p) {
  return p
    .split('/')
    .map((seg) => (/^\{.+\}$/.test(seg) ? '{p}' : seg))
    .join('/');
}

/** 解析单条 CSV 记录（支持引号包裹与转义引号） */
function parseCsvRow(rowText) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < rowText.length; i++) {
    const ch = rowText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (rowText[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      fields.push(current);
      current = '';
    } else current += ch;
  }
  fields.push(current);
  return fields;
}

/** 按记录拆分 CSV（引号内的换行不切分） */
function splitCsvRecords(csvText) {
  const records = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      records.push(current);
      current = '';
    } else current += ch;
  }
  if (current.trim()) records.push(current);
  return records;
}

function loadLiveRoutes() {
  let csv;
  if (liveCsvPath) {
    csv = fs.readFileSync(liveCsvPath, 'utf8');
  } else {
    csv = execSync(`python3 "${EXTRACTOR}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
  }
  const records = splitCsvRecords(csv).filter((r) => r.trim());
  if (records.length < 2) return new Set();
  const header = parseCsvRow(records[0]);
  const methodIdx = header.indexOf('method');
  const pathIdx = header.indexOf('full_path');
  if (methodIdx === -1 || pathIdx === -1) {
    throw new Error('live 路由 CSV 缺少 method/full_path 列');
  }
  const set = new Set();
  for (const record of records.slice(1)) {
    const cols = parseCsvRow(record);
    if (cols.length <= Math.max(methodIdx, pathIdx)) continue;
    const method = (cols[methodIdx] || '').toUpperCase();
    const route = cols[pathIdx];
    if (!method || !route) continue;
    set.add(`${method} ${normalizePath(route)}`);
  }
  return set;
}

function loadAggregatedPaths() {
  const spec = JSON.parse(fs.readFileSync(aggregatedPath, 'utf8'));
  const set = new Set();
  for (const [route, methods] of Object.entries(spec.paths || {})) {
    for (const method of Object.keys(methods || {})) {
      set.add(`${method.toUpperCase()} ${normalizePath(route)}`);
    }
  }
  return set;
}

function main() {
  const live = loadLiveRoutes();
  const documented = loadAggregatedPaths();

  const missing = [...live].filter((k) => !documented.has(k)).sort();
  const extra = [...documented].filter((k) => !live.has(k)).sort();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  聚合 OpenAPI 棘轮门禁（W6-C）');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  产物: ${path.relative(REPO_ROOT, aggregatedPath)}`);
  console.log(`  Live 路由（方法×路径）:       ${live.size}`);
  console.log(`  聚合产物（方法×路径）:        ${documented.size}`);
  console.log(`  live 有 / 产物无:             ${missing.length}`);
  console.log(`  产物有 / live 无:             ${extra.length}`);
  console.log('═══════════════════════════════════════════════════════');

  const current = {
    live_routes_count: live.size,
    aggregated_routes_count: documented.size,
    missing_in_openapi: missing.length,
    extra_in_openapi: extra.length,
  };

  if (updateBaseline) {
    const baseline = {
      _comment:
        '聚合 OpenAPI 棘轮基线（只允许下降）。重生成产物后运行 --update-baseline 收紧。',
      updated_at: new Date().toISOString(),
      ...current,
    };
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
    console.log(`\n[基线已更新] ${path.relative(REPO_ROOT, baselinePath)}`);
    return 0;
  }

  if (!fs.existsSync(baselinePath)) {
    console.log(`\n[WARN] 基线不存在：${path.relative(REPO_ROOT, baselinePath)}`);
    console.log('  先运行 --update-baseline 建立基线（或 --report-only 仅观察）。');
    return reportOnly ? 0 : 1;
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const regressed = [];
  if (current.missing_in_openapi > baseline.missing_in_openapi) {
    regressed.push(
      `live 有 / 产物无: ${baseline.missing_in_openapi} → ${current.missing_in_openapi}（+${
        current.missing_in_openapi - baseline.missing_in_openapi
      }）`
    );
  }
  if (current.extra_in_openapi > baseline.extra_in_openapi) {
    regressed.push(
      `产物有 / live 无: ${baseline.extra_in_openapi} → ${current.extra_in_openapi}（+${
        current.extra_in_openapi - baseline.extra_in_openapi
      }）`
    );
  }

  if (regressed.length === 0) {
    console.log(`\n✅ PASS: 未超过基线（missing≤${baseline.missing_in_openapi}, extra≤${baseline.extra_in_openapi}）`);
    return 0;
  }

  console.error('\n❌ FAIL: 聚合 OpenAPI 产物落后于代码（棘轮基线被突破）');
  regressed.forEach((r) => console.error(`  - ${r}`));
  if (missing.length > 0) {
    console.error('\n  [Sample] live 有 / 产物无（前 20 条）:');
    missing.slice(0, 20).forEach((k) => console.error(`    + ${k}`));
  }
  console.error('\n  修复方式: ./scripts/openapi/generate.sh --extract');
  console.error('  重生成后: node scripts/ci/check-openapi-aggregated.cjs --update-baseline');
  return reportOnly ? 0 : 1;
}

process.exit(main());
