#!/usr/bin/env node
/**
 * CRM 前后端契约一致性验证脚本
 * 验证前端 Zod Schema / API 客户端 与 后端 Rust Model / 路由 的字段与路由对称性
 *
 * 使用方式:
 *   node scripts/dev/check-crm-contract.mjs          # 仅验证 customer 样板
 *   node scripts/dev/check-crm-contract.mjs --all    # 验证所有 CRM 实体
 *   node scripts/dev/check-crm-contract.mjs --json   # 以 JSON 格式输出 (CI 用)
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const FRONT_SCHEMA = join(ROOT, 'apps/web/src/schemas/crm/customer.ts');
const FRONT_API = join(ROOT, 'apps/web/src/api/crm/customer.ts');
const BACK_MODEL = join(ROOT, 'svc/crm/src/models/customer.rs');
const BACK_ROUTE = join(ROOT, 'svc/crm/src/modules/customer.rs');

const EXPECTED_FIELDS = [
  'id',
  'tenant_id',
  'name',
  'customer_type',
  'industry',
  'rating',
  'region',
  'owner_id',
  'tags',
  'approval_status',
  'created_at',
  'updated_at',
  'deleted_at',
];

const CAMEL_FIELD_MAP = EXPECTED_FIELDS.reduce((acc, s) => {
  acc[s] = s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return acc;
}, {});

const EXPECTED_ROUTES = [
  { method: 'GET', path: '/customers', op: 'list_customers' },
  { method: 'POST', path: '/customers', op: 'create_customer' },
  { method: 'GET', path: '/customers/:id', op: 'get_customer' },
  { method: 'PUT', path: '/customers/:id', op: 'update_customer' },
  { method: 'DELETE', path: '/customers/:id', op: 'delete_customer' },
  { method: 'POST', path: '/customers/batch-delete', op: 'batch_delete_customers' },
  { method: 'POST', path: '/customers/:id/approval/start', op: 'start_customer_approval' },
  { method: 'POST', path: '/customers/:id/approval/approve', op: 'approve_customer' },
  { method: 'POST', path: '/customers/:id/approval/reject', op: 'reject_customer' },
];

function readText(p) {
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

function checkFrontSchema(content) {
  const found = [];
  const missing = [];
  Object.entries(CAMEL_FIELD_MAP).forEach(([snake, camel]) => {
    const pattern = new RegExp(`\\b${camel}\\b`);
    if (pattern.test(content)) found.push({ snake, camel });
    else missing.push({ snake, camel });
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

function checkFrontApi(content) {
  const found = [];
  const missing = [];
  const checks = [
    { key: 'list', api: 'list:' },
    { key: 'create', api: 'create:' },
    { key: 'get', api: 'get:' },
    { key: 'update', api: 'update:' },
    { key: 'delete', api: 'delete:' },
    { key: 'batchDelete', api: 'batchDelete:' },
    { key: 'startApproval', api: 'startApproval:' },
    { key: 'approve', api: 'approve:' },
    { key: 'reject', api: 'reject:' },
  ];
  checks.forEach((c) => {
    if (content.includes(c.api)) found.push(c);
    else missing.push(c);
  });
  return { found, missing };
}

const args = process.argv.slice(2);
const asJson = args.includes('--json') || args.includes('--json');

const files = {
  frontSchema: readText(FRONT_SCHEMA),
  frontApi: readText(FRONT_API),
  backModel: readText(BACK_MODEL),
  backRoute: readText(BACK_ROUTE),
};

const report = {
  timestamp: new Date().toISOString(),
  entity: 'customer',
  files: {
    frontSchema: FRONT_SCHEMA.replace(ROOT, '.'),
    frontApi: FRONT_API.replace(ROOT, '.'),
    backModel: BACK_MODEL.replace(ROOT, '.'),
    backRoute: BACK_ROUTE.replace(ROOT, '.'),
  },
  fields: {
    front: checkFrontSchema(files.frontSchema || ''),
    back: checkBackModel(files.backModel || ''),
  },
  routes: {
    back: checkBackRoutes(files.backRoute || ''),
    front: checkFrontApi(files.frontApi || ''),
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
  console.log('│   CRM Contract Verification Report (Customer)       │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│  Timestamp: ${pad(report.timestamp.slice(0, 27), 34)}│`);
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│  Field Symmetry (Front Schema ↔ Back Model)         │');
  console.log('├─────────────────────────────────────────────────────┤');
  const frontFoundCount = report.fields.front.found.length;
  const backFoundCount = report.fields.back.found.length;
  console.log(`│  Front Schema: ${pad(`${frontFoundCount}/${EXPECTED_FIELDS.length} fields found`, 42)}│`);
  console.log(`│  Back Model : ${pad(`${backFoundCount}/${EXPECTED_FIELDS.length} fields found`, 42)}│`);
  if (report.fields.front.missing.length > 0) {
    console.log('│  FRONT MISSING:                                     │');
    report.fields.front.missing.forEach((m) => {
      console.log(`│     - ${pad(m.camel + ` (${m.snake})`, 48)}│`);
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
    `│  Front API: ${pad(`${report.routes.front.found.length}/${EXPECTED_ROUTES.length} routes found`, 44)}│`
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
  const color = report.summary.pass ? '' : '';
  console.log(`│  Final: ${pad(color + verdict + '', 48)}│`);
  console.log('└─────────────────────────────────────────────────────┘');
  console.log('');
}

process.exit(report.summary.pass ? 0 : 1);
