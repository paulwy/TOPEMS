#!/usr/bin/env node
/**
 * 静默空表排查：接口返回了数组数据，页面却显示「0 行 / 共 0 条」
 *
 * 背景：`/srm/contract` 曾经接口 200 + 有数据，页面「总数 0、行 0」——因为前端把
 * `{contracts:[...], total}` 当数组用，运行时抛错被空态兜住。列表一致性检查只比「总数 vs 行」，
 * 这种两边都是 0 的情况看不出来；页面健康检查要求页面抛错进 console 才会红。
 * 这个脚本补的就是这条缝：以「接口里有数组 + 页面表格为空」为线索，输出候选供人工确认。
 *
 * 只产候选、不判生死：很多页面确实会拉多个列表（统计卡、下拉选项），空表格是正常的。
 *
 * 用法：
 *   node scripts/check-silent-empty.mjs                 # 12 条代表路由
 *   node scripts/check-silent-empty.mjs --all --max 220
 *   node scripts/check-silent-empty.mjs --min-items 3   # 数组至少 3 条才报（默认 1）
 *   node scripts/check-silent-empty.mjs --json /tmp/candidates.json
 *
 * 退出码：恒为 0（这是排查工具，不是门禁）。
 */
import { chromium } from 'playwright';
import { login, installAuth, fetchMenuPaths, argOf, hasFlag } from './lib/auth-session.mjs';

const argv = process.argv.slice(2);
const WEB_BASE = argOf(argv, 'web', process.env.WEB_BASE || 'http://localhost:3000');
const API_BASE = argOf(argv, 'api', process.env.API_BASE || 'http://127.0.0.1:8099');
const TENANT_ID = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000001';
const PAGE_TIMEOUT = Number(argOf(argv, 'timeout', '12')) * 1000;
const MAX_ROUTES = Number(argOf(argv, 'max', '12'));
const MIN_ITEMS = Number(argOf(argv, 'min-items', '1'));
const JSON_OUT = argOf(argv, 'json', '');
const ALL = hasFlag(argv, 'all');

const DEFAULT_ROUTES = [
  '/wms/warehouse-management',
  '/wms/inbound',
  '/srm/contract',
  '/srm/evaluation',
  '/srm/order',
  '/srm/performance',
  '/crm/customers',
  '/scm/purchase-orders',
  '/finance/vouchers',
  '/mes/production-orders',
  '/hrm/employees',
  '/srm/product',
];

const jsonPayloads = [];

// 排除导航/会话类接口：它们每页都会请求，与表格数据无关
const PAYLOAD_SKIP = [
  /\/api\/core\/menus/,
  /\/api\/core\/iam\/perm/,
  /\/api\/core\/notifications/,
  /\/api\/core\/health/,
  /\/api\/core\/config/,
  /\/api\/core\/whoami/,
];

function arraysIn(node) {
  const out = [];
  const walk = (v, depth) => {
    if (depth > 3 || v == null) return;
    if (Array.isArray(v)) {
      if (v.length >= MIN_ITEMS) out.push({ key: null, len: v.length, sample: sampleOf(v[0]) });
      return;
    }
    if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) if (Array.isArray(val) && val.length >= MIN_ITEMS) out.push({ key: k, len: val.length, sample: sampleOf(val[0]) });
    }
  };
  walk(node, 0);
  return out;
}

function sampleOf(o) {
  if (!o || typeof o !== 'object') return '';
  const keys = Object.keys(o).slice(0, 6).join(',');
  return `{${keys}}`;
}

async function visit(page, route) {
  jsonPayloads.length = 0;
  const onResponse = async (res) => {
    const url = res.url();
    if (!/\/api\//.test(url)) return;
    if (res.status() !== 200) return;
    const ct = res.headers()['content-type'] || '';
    if (!ct.includes('json')) return;
    let body;
    try {
      body = await res.json();
    } catch {
      return;
    }
    if (!body || body.success === false) return;
    if (PAYLOAD_SKIP.some((re) => re.test(url))) return;
    const arrays = arraysIn(body.data).filter((a) => a.sample !== '');
    if (arrays.length) {
      const path = url.replace(API_BASE, '').replace(/[?].*$/, '').replace(WEB_BASE, '');
      if (!jsonPayloads.some((p) => p.path === path)) jsonPayloads.push({ path, arrays });
    }
  };
  page.on('response', onResponse);

  const t0 = Date.now();
  await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  while (Date.now() - t0 < PAGE_TIMEOUT) {
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText || '').catch(() => '');
    if (text && !/加载中/.test(text.slice(-40))) {
      await page.waitForTimeout(700);
      break;
    }
  }
  page.off('response', onResponse);

  const state = await page
    .evaluate(() => {
      const bodyText = document.body.innerText || '';
      const m = bodyText.match(/共\s*(\d+)\s*条/);
      const trs = Array.from(document.querySelectorAll('table tbody tr'));
      const rows = trs.filter((tr) => !tr.innerText.includes('暂无数据') && tr.querySelectorAll('td').length > 1).length;
      return { total: m ? Number(m[1]) : null, rows, hasTable: document.querySelectorAll('table').length > 0 };
    })
    .catch(() => ({ total: null, rows: 0, hasTable: false }));

  return { route, state, payloads: [...jsonPayloads] };
}

(async () => {
  const creds = await login({ apiBase: API_BASE, tenantId: TENANT_ID, username: 'admin', password: 'Topems@2026' });
  const explicit = argOf(argv, 'routes', '');
  let routes = explicit
    ? explicit.split(',').map((s) => s.trim()).filter(Boolean)
    : ALL
      ? await fetchMenuPaths({ apiBase: API_BASE, tenantId: TENANT_ID, token: creds.token, includeDashboards: true })
      : DEFAULT_ROUTES;
  routes = [...new Set(routes)].slice(0, MAX_ROUTES);

  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installAuth(context, creds, TENANT_ID);
  const page = await context.newPage();

  console.log(`静默空表排查  web=${WEB_BASE}  路由 ${routes.length} 条  阈值 ${MIN_ITEMS} 条`);
  const candidates = [];
  for (const route of routes) {
    let r;
    try {
      r = await visit(page, route);
    } catch (e) {
      console.log(`  ERR           ${route.padEnd(30)} ${String(e).slice(0, 80)}`);
      continue;
    }
    const { state, payloads } = r;
    const empty = state.hasTable && state.rows === 0 && (state.total === null || state.total === 0);
    const maxLen = payloads.reduce((m, p) => Math.max(m, ...p.arrays.map((a) => a.len)), 0);
    if (empty && payloads.length) {
      candidates.push({ route, state, payloads });
      console.log(`  CANDIDATE     ${route.padEnd(30)} 共=${state.total ?? 'null'} 行=0  接口数组最大 ${maxLen} 条`);
      for (const p of payloads.slice(0, 4)) {
        const desc = p.arrays.map((a) => `${a.key || '[]'}:${a.len}`).join(' ');
        console.log(`      ${p.path.padEnd(52)} ${desc}`);
      }
    } else if (empty) {
      console.log(`  EMPTY         ${route.padEnd(30)} 共=${state.total ?? 'null'} 行=0  接口无数组数据`);
    } else {
      console.log(`  ok            ${route.padEnd(30)} 共=${state.total ?? 'null'} 行=${state.rows}`);
    }
  }

  await browser.close();
  console.log(`\n候选 ${candidates.length} 页 / 共检查 ${routes.length} 页（需人工确认，非判定）`);
  if (JSON_OUT) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(JSON_OUT, JSON.stringify({ at: new Date().toISOString(), candidates }, null, 2));
    console.log(`明细已写入 ${JSON_OUT}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error('脚本级错误：', e && e.message ? e.message : e);
  process.exit(2);
});
