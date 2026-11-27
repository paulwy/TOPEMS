#!/usr/bin/env node
/**
 * check-openapi-coverage.cjs — OpenAPI 覆盖门禁
 *
 * 对比「实际挂载路由」与「docs/api/openapi.json」的覆盖差异。
 * 路径参数归一化后求差集：
 *   - live 有但 openapi 没有 → missing_in_openapi（live 漂移）
 *   - openapi 有但 live 没有 → extra_in_openapi（文档漂移）
 *
 * 行为两阶段：
 *   1. 基线未建立（无 docs/api/openapi-baseline-gaps.json）
 *      → 输出报告 + exit 0（WARN-only，不阻断 CI）
 *   2. 基线已建立
 *      → 仅「新出现的漂移」才失败（exit 1）；白名单内差异忽略
 *
 * 用法：
 *   node scripts/ci/check-openapi-coverage.cjs                  # 默认：跑 extractor + 对比
 *   node scripts/ci/check-openapi-coverage.cjs --live-csv X    # 用已有 CSV
 *   node scripts/ci/check-openapi-coverage.cjs --gen-baseline  # 生成基线白名单
 *   node scripts/ci/check-openapi-coverage.cjs --openapi-path /path/to/openapi.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── 配置 ────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OPENAPI = path.join(REPO_ROOT, 'docs/api/openapi.json');
const DEFAULT_BASELINE = path.join(REPO_ROOT, 'docs/api/openapi-baseline-gaps.json');
const EXTRACTOR = path.join(REPO_ROOT, 'scripts/dev/extract-live-routes.py');

// ─── 参数解析 ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let liveCsvPath = null;
let openapiPath = DEFAULT_OPENAPI;
let baselinePath = DEFAULT_BASELINE;
let genBaseline = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--live-csv' && args[i + 1]) {
    liveCsvPath = args[++i];
  } else if (args[i] === '--openapi-path' && args[i + 1]) {
    openapiPath = args[++i];
  } else if (args[i] === '--baseline-path' && args[i + 1]) {
    baselinePath = args[++i];
  } else if (args[i] === '--gen-baseline') {
    genBaseline = true;
  } else if (args[i] === '--help') {
    console.log(`
用法: node check-openapi-coverage.cjs [选项]

选项:
  --live-csv <path>       已有 live 路由 CSV（默认自动跑 extractor）
  --openapi-path <path>   OpenAPI JSON 路径（默认 docs/api/openapi.json）
  --baseline-path <path>  基线白名单路径（默认 docs/api/openapi-baseline-gaps.json）
  --gen-baseline          生成基线白名单（覆盖已有文件）
  --help                  显示帮助
`);
    process.exit(0);
  }
}

// ─── 工具函数 ────────────────────────────────────────────────────────────

/**
 * 路径参数归一化：{id}/{user_id}/{tenant_id} 等参数段 → {p}
 * 例：/api/crm/customers/{id} → /api/crm/customers/{p}
 *     /api/hrm/employees/{emp_id}/dept → /api/hrm/employees/{p}/dept
 */
function normalizePath(p) {
  // 历史挂载别名：unified-core 的 flow/iam 路由实际挂在 /api/core 下，
  // 但 utoipa 注解仍带 /api/core/flow、/api/core/iam 前缀。比较前折叠该前缀，
  // 否则每新增一个已注解 handler 都会产生一批“文档有、live 无”的假漂移。
  // TODO(api): 逐模块把注解前缀迁到真实 /api/core，再移除此别名。
  const canonical = p.replace(/^\/api\/core\/(flow|iam)\//, '/api/core/');
  return canonical
    .split('/')
    .map((seg) => {
      // 匹配 {param_name} 模式
      if (/^\{.+\}$/.test(seg)) {
        return '{p}';
      }
      return seg;
    })
    .join('/');
}

/**
 * 简易 CSV 行解析器：支持引号包裹字段、引号内逗号与换行。
 * 不是完整 RFC 4180，但足够本项目的路由 CSV 用。
 */
function parseCsvRow(rowText) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < rowText.length; i++) {
    const ch = rowText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (rowText[i + 1] === '"') {
          // 转义引号 ""
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * 从 CSV 文本解析 live 路由（处理多行引号字段）
 */
function parseLiveCsv(csvText) {
  // 先按记录拆分：一条记录可能跨多行（字段内有换行）
  // 策略：逐字符扫描，跟踪引号状态，记录结束（非引号内换行）才算新行
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
    } else {
      current += ch;
    }
  }
  if (current.trim()) records.push(current);

  if (records.length < 2) return [];

  const header = parseCsvRow(records[0]);
  const idx = {
    method: header.indexOf('method'),
    fullPath: header.indexOf('full_path'),
  };

  const routes = [];
  for (let i = 1; i < records.length; i++) {
    const cols = parseCsvRow(records[i]);
    if (cols.length <= Math.max(idx.method, idx.fullPath)) continue;
    routes.push({
      method: cols[idx.method].toUpperCase(),
      path: cols[idx.fullPath],
    });
  }
  return routes;
}

/**
 * 从 openapi.json 解析 (method, path) 集合
 */
function parseOpenapi(spec) {
  const result = [];
  const paths = spec.paths || {};
  for (const [pathItem, methods] of Object.entries(paths)) {
    for (const method of Object.keys(methods)) {
      // openapi 方法名是小写
      result.push({
        method: method.toUpperCase(),
        path: pathItem,
      });
    }
  }
  return result;
}

/**
 * 转成归一化的 "METHOD path" 键集合
 */
function toNormalizedSet(routes) {
  const set = new Set();
  for (const r of routes) {
    set.add(`${r.method} ${normalizePath(r.path)}`);
  }
  return set;
}

// ─── 主流程 ──────────────────────────────────────────────────────────────

function main() {
  // 1. 获取 live 路由
  let liveCsvText;
  if (liveCsvPath) {
    liveCsvText = fs.readFileSync(liveCsvPath, 'utf-8');
  } else {
    console.log('[info] 自动运行 extractor 获取 live 路由...');
    liveCsvText = execSync(`python3 "${EXTRACTOR}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  const liveRoutes = parseLiveCsv(liveCsvText);
  const liveSet = toNormalizedSet(liveRoutes);

  // 2. 获取 openapi paths
  const openapiSpec = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'));
  const openapiRoutes = parseOpenapi(openapiSpec);
  const openapiSet = toNormalizedSet(openapiRoutes);

  // 3. 计算差集
  // live 有但 openapi 没有 → missing_in_openapi（live 漂移）
  const missingInOpenapi = [...liveSet].filter((k) => !openapiSet.has(k)).sort();
  // openapi 有但 live 没有 → extraInOpenapi（文档漂移）
  const extraInOpenapi = [...openapiSet].filter((k) => !liveSet.has(k)).sort();

  const totalGaps = missingInOpenapi.length + extraInOpenapi.length;

  // 4. 输出报告
  console.log('═══════════════════════════════════════════════════════');
  console.log('  OpenAPI 覆盖门禁报告');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Live 路由数（归一化后）:     ${liveSet.size}`);
  console.log(`  OpenAPI paths 数（归一化后）: ${openapiSet.size}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  live 有 / openapi 无:        ${missingInOpenapi.length}`);
  console.log(`  openapi 有 / live 无:        ${extraInOpenapi.length}`);
  console.log(`  总漂移:                      ${totalGaps}`);
  console.log('═══════════════════════════════════════════════════════');

  // 5. 基线逻辑
  const baselineExists = fs.existsSync(baselinePath);

  if (genBaseline) {
    // 生成基线白名单
    const baseline = {
      _comment: 'OpenAPI 覆盖漂移基线白名单。新增路由若出现在 live 但不在 openapi，且不在此白名单中 → CI 失败。',
      generated_at: new Date().toISOString(),
      live_routes_count: liveSet.size,
      openapi_paths_count: openapiSet.size,
      gaps: {
        missing_in_openapi: missingInOpenapi,
        extra_in_openapi: extraInOpenapi,
      },
    };
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf-8');
    console.log(`\n[基线已生成] ${baselinePath}`);
    console.log(`  missing_in_openapi: ${missingInOpenapi.length} 条`);
    console.log(`  extra_in_openapi:   ${extraInOpenapi.length} 条`);
    console.log(`  白名单总计:         ${totalGaps} 条`);
    return 0;
  }

  if (!baselineExists) {
    // WARN-only 模式
    console.log('\n[WARN-only] 基线白名单未建立 → 仅报告不阻断。');
    console.log(`  生成基线命令: node ${path.relative(REPO_ROOT, __filename)} --gen-baseline`);

    // 打印前 20 条 sample
    if (missingInOpenapi.length > 0) {
      console.log(`\n  [Sample] live 有 / openapi 无（前 20 条）:`);
      for (const k of missingInOpenapi.slice(0, 20)) {
        console.log(`    - ${k}`);
      }
      if (missingInOpenapi.length > 20) {
        console.log(`    ... 还有 ${missingInOpenapi.length - 20} 条`);
      }
    }
    return 0;
  }

  // 基线模式：检查是否有新漂移
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  // 基线是历史生成物，里面可能残留 /api/core/flow|iam 旧前缀；比较前与 live/docs 同步归一，
  // 否则同一端点会因前缀不同被误判成“新漂移”。仅归一化，不隐藏真实新增。
  const normKey = (k) => {
    const [m, p] = k.split(' ');
    return `${m} ${normalizePath(p)}`;
  };
  const baselineMissing = new Set((baseline.gaps?.missing_in_openapi || []).map(normKey));
  const baselineExtra = new Set((baseline.gaps?.extra_in_openapi || []).map(normKey));

  // 新出现的漂移 = 当前漂移 - 基线白名单
  const newMissing = missingInOpenapi.filter((k) => !baselineMissing.has(k));
  const newExtra = extraInOpenapi.filter((k) => !baselineExtra.has(k));

  console.log(`\n[基线模式] 白名单条目: missing=${baselineMissing.size}, extra=${baselineExtra.size}`);
  console.log(`  新出现漂移: missing=${newMissing.length}, extra=${newExtra.length}`);

  if (newMissing.length > 0 || newExtra.length > 0) {
    console.error('\n❌ FAIL: 检测到新的 OpenAPI 覆盖漂移！');
    if (newMissing.length > 0) {
      console.error(`\n  [新] live 有 / openapi 无 (${newMissing.length} 条):`);
      for (const k of newMissing.slice(0, 30)) {
        console.error(`    + ${k}`);
      }
      if (newMissing.length > 30) {
        console.error(`    ... 还有 ${newMissing.length - 30} 条`);
      }
    }
    if (newExtra.length > 0) {
      console.error(`\n  [新] openapi 有 / live 无 (${newExtra.length} 条):`);
      for (const k of newExtra.slice(0, 30)) {
        console.error(`    + ${k}`);
      }
      if (newExtra.length > 30) {
        console.error(`    ... 还有 ${newExtra.length - 30} 条`);
      }
    }
    console.error('\n  修复方式:');
    console.error('    1. 将新路由加入 openapi.json（方向乙）');
    console.error('    2. 或确认误报后更新基线: --gen-baseline');
    return 1;
  }

  console.log('\n✅ PASS: 无新漂移（所有差异均在基线白名单内）');
  return 0;
}

process.exit(main());
