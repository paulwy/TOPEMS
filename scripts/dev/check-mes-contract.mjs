#!/usr/bin/env node
/**
 * MES 前后端契约一致性验证脚本
 * 验证前端 EntitySchema / API 客户端 与 后端 Rust Model / 路由 的字段与路由对称性
 *
 * 样板实体: production_order（与 CRM customer 样板对齐）
 *
 * 使用方式:
 *   node scripts/dev/check-mes-contract.mjs          # 默认验证 production_order
 *   node scripts/dev/check-mes-contract.mjs --json   # 以 JSON 格式输出 (CI 用)
 *
 * 挂入 pre-commit / CI:
 *   "scripts:check:mes-contract": "node scripts/dev/check-mes-contract.mjs"
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// 样板实体文件路径（production_order）
const FRONT_SCHEMA = join(ROOT, 'apps/web/src/schemas/mes/productionOrder.ts');
const FRONT_TYPES = join(ROOT, 'apps/web/src/api/mes/types.ts');
const FRONT_API = join(ROOT, 'apps/web/src/api/mes/productionOrder.ts');
const FRONT_APPROVAL_API = join(ROOT, 'apps/web/src/api/mes/approval.ts');
const BACK_MODEL = join(ROOT, 'svc/mes/src/models/production_order.rs');
const BACK_ROUTE = join(ROOT, 'svc/mes/src/modules/production_order.rs');

// 后端 ProductionOrderResponse 字段（source of truth）
const EXPECTED_FIELDS = [
  'id',
  'order_no',
  'product_id',
  'product_name',
  'product_code',
  'quantity',
  'completed_quantity',
  'status',
  'source',
  'source_order_id',
  'source_order_number',
  'planned_start_date',
  'planned_end_date',
  'actual_start_date',
  'actual_end_date',
  'workshop_id',
  'notes',
  'approval_id',
  'created_at',
  'updated_at',
];

// snake_case → camelCase 映射（前端可能使用任一形式）
const CAMEL_FIELD_MAP = EXPECTED_FIELDS.reduce((acc, s) => {
  acc[s] = s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return acc;
}, {});

// 后端路由（从 create_routes() 提取）
const EXPECTED_ROUTES = [
  { method: 'GET', path: '/orders', op: 'list_production_orders' },
  { method: 'POST', path: '/orders', op: 'create_production_order' },
  { method: 'POST', path: '/orders/from-erp', op: 'create_from_erp' },
  { method: 'GET', path: '/orders/:id', op: 'get_production_order' },
  { method: 'PUT', path: '/orders/:id', op: 'update_production_order' },
  { method: 'DELETE', path: '/orders/:id', op: 'delete_production_order' },
  { method: 'PUT', path: '/orders/:id/release', op: 'release_production_order' },
  { method: 'PUT', path: '/orders/:id/start', op: 'start_production_order' },
  { method: 'PUT', path: '/orders/:id/complete', op: 'complete_production_order' },
  { method: 'PUT', path: '/orders/:id/cancel', op: 'cancel_production_order' },
  { method: 'POST', path: '/orders/:id/approval/start', op: 'start_order_approval' },
  { method: 'POST', path: '/orders/:id/approval/approve', op: 'approve_order' },
  { method: 'POST', path: '/orders/:id/approval/reject', op: 'reject_order' },
];

// 前端 API 方法名（productionOrder.ts + approval.ts）
const EXPECTED_FRONT_METHODS = [
  { key: 'list', api: 'list:' },
  { key: 'create', api: 'create:' },
  { key: 'createFromErp', api: 'createFromErp:' },
  { key: 'get', api: 'get:' },
  { key: 'update', api: 'update:' },
  { key: 'delete', api: 'delete:' },
  { key: 'release', api: 'release:' },
  { key: 'start', api: 'start:' },
  { key: 'complete', api: 'complete:' },
  { key: 'cancel', api: 'cancel:' },
  { key: 'startProductionOrderApproval', api: 'startProductionOrderApproval:' },
  { key: 'approveProductionOrder', api: 'approveProductionOrder:' },
  { key: 'rejectProductionOrder', api: 'rejectProductionOrder:' },
];

function readText(p) {
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

function checkFrontSchema(...contents) {
  const found = [];
  const missing = [];
  Object.entries(CAMEL_FIELD_MAP).forEach(([snake, camel]) => {
    const snakePattern = new RegExp(`\\b${snake}\\b`);
    const camelPattern = new RegExp(`\\b${camel}\\b`);
    const present = contents.some((c) => snakePattern.test(c) || camelPattern.test(c));
    if (present) {
      found.push({ snake, camel });
    } else {
      missing.push({ snake, camel });
    }
  });
  return { found, missing };
}

function checkBackModel(content) {
  const found = [];
  const missing = [];
  EXPECTED_FIELDS.forEach((snake) => {
    const pattern = new RegExp(`\\b${snake}\\b`);
    if (pattern.test(content)) found.push(snake);
    else missing.push(snake);
  });
  return { found, missing };
}

function checkBackRoutes(content) {
  const found = [];
  const missing = [];
  EXPECTED_ROUTES.forEach((route) => {
    const opPattern = new RegExp(`\\b${route.op}\\b`);
    if (opPattern.test(content)) found.push(route);
    else missing.push(route);
  });
  return { found, missing };
}

function checkFrontApi(...contents) {
  const found = [];
  const missing = [];
  const combined = contents.join('\n');
  EXPECTED_FRONT_METHODS.forEach((c) => {
    // 兼容两种声明形式：`methodName: async` 和 `async methodName(`
    const colonPattern = new RegExp(`\\b${c.key}\\s*:`);
    const asyncPattern = new RegExp(`\\basync\\s+${c.key}\\s*\\(`);
    const present = colonPattern.test(combined) || asyncPattern.test(combined);
    if (present) found.push(c);
    else missing.push(c);
  });
  return { found, missing };
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');

const files = {
  frontSchema: readText(FRONT_SCHEMA),
  frontTypes: readText(FRONT_TYPES),
  frontApi: readText(FRONT_API),
  frontApprovalApi: readText(FRONT_APPROVAL_API),
  backModel: readText(BACK_MODEL),
  backRoute: readText(BACK_ROUTE),
};

const report = {
  timestamp: new Date().toISOString(),
  entity: 'production_order',
  files: {
    frontSchema: FRONT_SCHEMA.replace(ROOT, '.'),
    frontTypes: FRONT_TYPES.replace(ROOT, '.'),
    frontApi: FRONT_API.replace(ROOT, '.'),
    frontApprovalApi: FRONT_APPROVAL_API.replace(ROOT, '.'),
    backModel: BACK_MODEL.replace(ROOT, '.'),
    backRoute: BACK_ROUTE.replace(ROOT, '.'),
  },
  fields: {
    front: checkFrontSchema(files.frontSchema || '', files.frontTypes || ''),
    back: checkBackModel(files.backModel || ''),
  },
  routes: {
    back: checkBackRoutes(files.backRoute || ''),
    front: checkFrontApi(files.frontApi || '', files.frontApprovalApi || ''),
  },
  summary: { fieldMismatch: false, routeMismatch: false, pass: true },
};

if (report.fields.front.missing.length > 0) report.summary.fieldMismatch = true;
if (report.fields.back.missing.length > 0) report.summary.fieldMismatch = true;
if (report.routes.front.missing.length > 0) report.summary.routeMismatch = true;
if (report.routes.back.missing.length > 0) report.summary.routeMismatch = true;
report.summary.pass = !report.summary.fieldMismatch && !report.summary.routeMismatch;

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const pad = (s, n) => (s.length >= n ? s : s + ' '.repeat(n - s.length));
  console.log('');
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│   MES Contract Verification Report (ProductionOrder)│');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│  Timestamp: ${pad(report.timestamp.slice(0, 27), 34)}│`);
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│  Field Symmetry (Front Schema+Types ↔ Back Model)   │');
  console.log('├─────────────────────────────────────────────────────┤');
  const frontFoundCount = report.fields.front.found.length;
  const backFoundCount = report.fields.back.found.length;
  console.log(`│  Front Schema+Types: ${pad(`${frontFoundCount}/${EXPECTED_FIELDS.length} fields found`, 38)}│`);
  console.log(`│  Back Model : ${pad(`${backFoundCount}/${EXPECTED_FIELDS.length} fields found`, 42)}│`);
  if (report.fields.front.missing.length > 0) {
    console.log('│  FRONT MISSING:                                     │');
    report.fields.front.missing.forEach((m) => {
      console.log(`│     - ${pad(`${m.camel} (${m.snake})`, 48)}│`);
    });
  }
  if (report.fields.back.missing.length > 0) {
    console.log('│  BACK MISSING:                                      │');
    report.fields.back.missing.forEach((m) => {
      console.log(`│     - ${pad(m, 48)}│`);
    });
  }
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│  Route Symmetry (API Client ↔ Axum Handlers)        │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(
    `│  Front API: ${pad(`${report.routes.front.found.length}/${EXPECTED_FRONT_METHODS.length} methods found`, 44)}│`
  );
  console.log(
    `│  Back Handlers: ${pad(`${report.routes.back.found.length}/${EXPECTED_ROUTES.length} handlers found`, 40)}│`
  );
  if (report.routes.front.missing.length > 0) {
    console.log('│  FRONT API MISSING:                                 │');
    report.routes.front.missing.forEach((m) => {
      console.log(`│     - ${pad(m.key, 48)}│`);
    });
  }
  if (report.routes.back.missing.length > 0) {
    console.log('│  BACK HANDLERS MISSING:                             │');
    report.routes.back.missing.forEach((m) => {
      console.log(`│     - ${pad(`${m.method} ${m.path}`, 48)}│`);
    });
  }
  console.log('├─────────────────────────────────────────────────────┤');
  const verdict = report.summary.pass ? 'PASS ✓' : 'FAIL ✗';
  console.log(`│  Final: ${pad(verdict, 48)}│`);
  console.log('└─────────────────────────────────────────────────────┘');
  console.log('');
}

process.exit(report.summary.pass ? 0 : 1);
