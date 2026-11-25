#!/usr/bin/env node
/**
 * 列表页「总数 vs 行渲染」一致性回归检查
 *
 * 背景：ListPageTemplate 曾用 `propData ?? crudResult.data` 取数，页面目录重构后 20+ 处调用
 * 统一写成 `data={[]}`，空数组不是 nullish，导致 crud 拉回的行被覆盖 —— 页面表现为
 * 「1-10 共 29 条」但表格显示「暂无数据」。这类回归非常隐蔽：接口 200、总数正确、只丢行。
 *
 * 本脚本用无头浏览器照真实前端逻辑跑一遍：登录 → 逐页打开 → 读分页总数与 tbody 行数 →
 * 断言「总数 > 0 时必须有行」。不依赖人工逐页翻，也不依赖具体页面组件实现。
 *
 * 用法（在 apps/web 下执行）：
 *   node scripts/check-list-page-consistency.mjs
 *   node scripts/check-list-page-consistency.mjs --all --max 30
 *   node scripts/check-list-page-consistency.mjs --routes /wms/warehouse-management,/crm/customers
 *   node scripts/check-list-page-consistency.mjs --json /tmp/list-consistency.json
 *
 * 环境变量（都有默认值，默认指向本机开发栈）：
 *   WEB_BASE   http://localhost:3000
 *   API_BASE   http://127.0.0.1:8099
 *   USERNAME   admin      PASSWORD  Topems@2026
 *   TENANT_ID  00000000-0000-0000-0000-000000000001
 *
 * 退出码：0 全部一致（含被跳过的页不计失败）；1 存在「有总数没行」或脚本级错误。
 */
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=').slice(1).join('=');
  const idx = argv.indexOf(`--${name}`);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1];
  return dflt;
};
const has = (name) => argv.includes(`--${name}`);

const WEB_BASE = arg('web', process.env.WEB_BASE || 'http://localhost:3000');
const API_BASE = arg('api', process.env.API_BASE || 'http://127.0.0.1:8099');
const USERNAME = process.env.USERNAME || 'admin';
const PASSWORD = process.env.PASSWORD || 'Topems@2026';
const TENANT_ID = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000001';
const PAGE_TIMEOUT = Number(arg('timeout', '35')) * 1000;
const MAX_ROUTES = Number(arg('max', '12'));
const JSON_OUT = arg('json', '');
const ALL = has('all');

// 默认抽查：覆盖改过模板后最容易踩的模块，且本机都有数据
const DEFAULT_ROUTES = [
  '/wms/warehouse-management',
  '/wms/inbound',
  '/crm/customers',
  '/mes/production-orders',
  '/finance/vouchers',
  '/scm/purchase-orders',
  '/wms/inventory',
  '/hr/employees',
];

const TOTAL_RE = /共\s*(\d+)\s*条/;
const EMPTY_RE = /暂无数据/;

async function login() {
  const res = await fetch(`${API_BASE}/api/core/iam/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const body = await res.json().catch(() => null);
  const data = body && body.data;
  if (!res.ok || !data || !data.access_token) {
    throw new Error(`登录失败：HTTP ${res.status} ${body ? JSON.stringify(body).slice(0, 120) : ''}`);
  }
  const user = data.user || {};
  return {
    token: data.access_token,
    refresh: data.refresh_token || '',
    expiresIn: Number(data.expires_in || 3600),
    user: JSON.stringify(user),
    roles: JSON.stringify(user.roles || []),
    permissions: JSON.stringify(user.permissions || []),
  };
}

async function fetchMenuPaths(token) {
  const res = await fetch(`${API_BASE}/api/core/menus`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': TENANT_ID },
  });
  const body = await res.json().catch(() => null);
  const items = (body && body.data && body.data.items) || [];
  return items
    .map((m) => m.path)
    .filter((p) => typeof p === 'string' && p.startsWith('/') && !p.includes(':'))
    .filter((p) => !p.includes('/detail'));
}

function dedupe(list) {
  return [...new Set(list)];
}

async function sample(page) {
  return page.evaluate(() => {
    const bodyText = document.body.innerText || '';
    const m = bodyText.match(/共\s*(\d+)\s*条/);
    const total = m ? Number(m[1]) : null;
    const trs = Array.from(document.querySelectorAll('table tbody tr'));
    const rows = trs.filter((tr) => !tr.innerText.includes('暂无数据')).length;
    return { total, rows, hasTable: document.querySelectorAll('table').length > 0 };
  }).catch(() => ({ total: null, rows: 0, hasTable: false }));
}

async function inspectRoute(page, route) {
  const t0 = Date.now();
  await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  let prev = null;
  let stable = 0;
  let last = { total: null, rows: 0, hasTable: false };
  let noTableSince = null;

  while (Date.now() - t0 < PAGE_TIMEOUT) {
    await page.waitForTimeout(1000);
    last = await sample(page);

    // 数据到位即可判定，不用等满超时
    if (last.total !== null && last.total > 0 && last.rows > 0) break;

    // 页面上根本没有表格（详情页/看板页/被权限挡住）：6 秒后放弃
    if (!last.hasTable) {
      if (noTableSince === null) noTableSince = Date.now();
      else if (Date.now() - noTableSince > 6000) break;
    } else {
      noTableSince = null;
    }

    // 静默判定：两次采样一致且已有表格，说明渲染稳定
    const key = `${last.total}/${last.rows}`;
    if (prev === key) stable += 1;
    else stable = 0;
    prev = key;
    if (last.hasTable && stable >= 2) break;
  }

  return { route, total: last.total, rows: last.rows, hasTable: last.hasTable, ms: Date.now() - t0 };
}

(async () => {
  const creds = await login();
  const explicit = arg('routes', '');
  let routes = explicit
    ? explicit.split(',').map((s) => s.trim()).filter(Boolean)
    : ALL
      ? await fetchMenuPaths(creds.token)
      : DEFAULT_ROUTES;
  routes = dedupe(routes).slice(0, Math.max(MAX_ROUTES, DEFAULT_ROUTES.length));

  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 在页面脚本执行前把登录态写进 localStorage（同源每个导航都会先跑这段）
  await context.addInitScript(
    ({ token, refresh, expiresIn, user, roles, permissions, tenant }) => {
      try {
        const exp = String(Date.now() + expiresIn * 1000);
        localStorage.setItem('token', token);
        localStorage.setItem('token_expiry', exp);
        if (refresh) localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', user);
        localStorage.setItem('roles', roles);
        localStorage.setItem('permissions', permissions);
        localStorage.setItem('current_tenant_id', tenant);
      } catch {
        /* 隐私模式/禁用存储时忽略，页面会自行跳登录 */
      }
    },
    { ...creds, tenant: TENANT_ID }
  );

  const page = await context.newPage();
  const failures = [];
  const results = [];

  console.log(`列表页一致性检查  web=${WEB_BASE}  路由 ${routes.length} 条`);
  for (const route of routes) {
    let r;
    try {
      r = await inspectRoute(page, route);
    } catch (e) {
      r = { route, total: null, rows: 0, sawTable: false, empty: false, error: String(e).slice(0, 80) };
    }
    results.push(r);

    let verdict = 'OK';
    if (r.error) verdict = 'ERROR';
    else if (!r.hasTable) verdict = 'SKIP(无表格)';
    else if (r.total !== null && r.total > 0 && r.rows === 0) verdict = 'FAIL';

    if (verdict === 'FAIL') failures.push(r);
    console.log(
      `  ${verdict.padEnd(11)} ${route.padEnd(30)} 总数=${String(r.total).padStart(4)}  行=${String(r.rows).padStart(3)}  ${r.ms}ms`
    );
  }

  await browser.close();

  const checked = results.filter((r) => r.hasTable).length;
  console.log(`\n汇总：检查 ${checked} 页（跳过无分页 ${results.length - checked} 页），不一致 ${failures.length} 页`);
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f.route} 总数=${f.total} 行=${f.rows}`);
    console.log('判定：FAIL（总数 > 0 但表格无行，检查 ListPageTemplate 的数据来源优先级）');
  } else {
    console.log('判定：OK');
  }

  if (JSON_OUT) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(JSON_OUT, JSON.stringify({ web: WEB_BASE, at: new Date().toISOString(), results }, null, 2));
    console.log(`明细已写入 ${JSON_OUT}`);
  }

  process.exit(failures.length ? 1 : 0);
})().catch((e) => {
  console.error('脚本级错误：', e && e.message ? e.message : e);
  process.exit(2);
});
