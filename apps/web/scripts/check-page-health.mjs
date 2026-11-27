#!/usr/bin/env node
/**
 * 页面健康度巡检：全站路由跑一遍，抓「页面本身坏了」的三类信号
 *
 * 与 check-list-page-consistency.mjs 互补：那个只管「列表有总数没行」，这个管更宽的
 * 「打开就报错」。覆盖到没有表格的看板/详情/移动端页，是列表一致性检查的上一层。
 *
 * 三类失败信号：
 *   1) 接口 5xx（页面渲染依赖的后端炸了）
 *   2) 未捕获的前端错误（console error 级别，过滤掉已知噪声）
 *   3) 命中错误边界（页面白屏被兜住）
 *
 * 另外两类只记为提示、不判负：
 *   - 接口 4xx（403 多为权限态，属预期；404 多为可选接口未实现）
 *   - 超时后仍停在「加载中」（开发模式 Vite 冷编译常见）
 *
 * 用法（在 apps/web 下执行）：
 *   node scripts/check-page-health.mjs                  # 默认 12 条代表路由
 *   node scripts/check-page-health.mjs --all --max 180  # 全量菜单
 *   node scripts/check-page-health.mjs --include-dashboards --all --max 60
 *   node scripts/check-page-health.mjs --routes /wms/warehouse-management,/finance/vouchers
 *
 * 环境变量与一致性检查一致：WEB_BASE / API_BASE / USERNAME / PASSWORD / TENANT_ID
 * 退出码：0 全绿；1 有失败项；2 脚本级错误
 */
import { chromium } from 'playwright';
import { runPool } from './lib/pool.mjs';
import { login, installAuth, fetchMenuPaths, argOf, hasFlag } from './lib/auth-session.mjs';

const argv = process.argv.slice(2);
const WEB_BASE = argOf(argv, 'web', process.env.WEB_BASE || 'http://localhost:3000');
const API_BASE = argOf(argv, 'api', process.env.API_BASE || 'http://127.0.0.1:8099');
const USERNAME = process.env.USERNAME || 'admin';
const PASSWORD = process.env.PASSWORD || 'Topems@2026';
const TENANT_ID = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000001';
const PAGE_TIMEOUT = Number(argOf(argv, 'timeout', '18')) * 1000;
// 移动端页面走 390×844 视口，且给更长的等待：这些页依赖大 chunk + 若干聚合接口，
// 在 Cloudflare 隧道链路上冷启动常超过桌面页的 18s 预算（2026-11-27 实测两页曾被误判白屏）。
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_TIMEOUT_MS = 35 * 1000;
const isMobileRoute = (route) => route.startsWith('/mobile');
const MAX_ROUTES = Number(argOf(argv, 'max', '12'));
const RETRIES = Number(argOf(argv, 'retries', '1'));
const CONCURRENCY = Number(argOf(argv, 'concurrency', '3'));
const JSON_OUT = argOf(argv, 'json', '');
const ALL = hasFlag(argv, 'all');
const INCLUDE_DASHBOARDS = hasFlag(argv, 'include-dashboards');

const DEFAULT_ROUTES = [
  '/dashboard',
  '/wms/warehouse-management',
  '/wms/inbound',
  '/wms/inventory',
  '/crm/customers',
  '/mes/production-orders',
  '/finance/vouchers',
  '/finance/ledger',
  '/scm/purchase-orders',
  '/hrm/employees',
  '/bi/dashboard',
  '/srm/product',
];

// 已知噪声：与页面功能无关的开发期告警
const NOISE = [
  /VITE_WS_SIGNING_SECRET/,
  /@emotion\/react when it is already loaded/,
  /Download the React DevTools/,
  /Deprecated API for given entry type/,
  /server config not found .*canary/i,
  /React Router Future Flag/i,
  /vite.*connected/i,
];

const BOUNDARY_RE = /页面出错了|页面遇到错误|Something went wrong|ErrorBoundary/;

// 软失败码：404 多为可选接口未实现、409 是业务冲突、501 是「数据源未接入」的显式降级，
// 页面靠空态/兜底仍可用，不算缺陷。带这些状态码的 console error 一并降级。
const SOFT_HTTP = [404, 409, 501];
const SOFT_CONSOLE_RE =
  /status code (404|409|501)|status of (404|409|501)|(API Error|API\]|ApiClient|AxiosError)[\s\S]{0,60}(404|409|501)/;

function isNoise(text) {
  return NOISE.some((re) => re.test(text));
}

function isSoftConsole(text) {
  return SOFT_CONSOLE_RE.test(text);
}

async function visit(page, route) {
  const consoleErrors = [];
  const http5xx = [];
  const http4xx = [];
  const softHttp = [];
  const softConsole = [];
  const onConsole = (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isNoise(text)) return;
    if (isSoftConsole(text)) {
      softConsole.push(text.slice(0, 160));
      return;
    }
    consoleErrors.push(text.slice(0, 200));
  };
  const onResponse = (res) => {
    const url = res.url();
    if (!/\/api\//.test(url)) return;
    const status = res.status();
    if (SOFT_HTTP.includes(status)) softHttp.push(`${status} ${url.replace(WEB_BASE, '').slice(0, 120)}`);
    else if (status >= 500) http5xx.push(`${status} ${url.replace(WEB_BASE, '').slice(0, 120)}`);
    else if (status >= 400) http4xx.push(`${status} ${url.replace(WEB_BASE, '').slice(0, 120)}`);
  };
  page.on('console', onConsole);
  page.on('response', onResponse);

  const t0 = Date.now();
  const timeoutMs = isMobileRoute(route) ? MOBILE_TIMEOUT_MS : PAGE_TIMEOUT;
  await page.setViewportSize(isMobileRoute(route) ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT);
  await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  let text = '';
  let stalled = true;
  while (Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(1000);
    text = await page.evaluate(() => document.body.innerText || '').catch(() => '');
    if (text && !/加载中/.test(text.slice(-40))) {
      stalled = false;
      await page.waitForTimeout(600); // 给异步请求一个落点
      break;
    }
  }

  page.off('console', onConsole);
  page.off('response', onResponse);

  return {
    route,
    ms: Date.now() - t0,
    stalled,
    boundary: BOUNDARY_RE.test(text),
    consoleErrors,
    http5xx,
    http4xx,
    softHttp,
    softConsole,
    // 白屏判定：剔除纯「加载中」占位后仍无实质正文才算。移动端页正文很短
    // （如 /mobile/quality 只有标题 + 空态 ≈ 60 字），阈值放到 20 字避免误杀。
    blank: text.replace(/加载中[.…]*/g, '').trim().length < 20,
  };
}

function verdictOf(r) {
  if (r.http5xx.length) return 'FAIL';
  if (r.consoleErrors.length) return 'FAIL';
  if (r.boundary) return 'FAIL';
  if (r.blank) return 'FAIL';
  if (r.stalled) return 'WARN(加载超时)';
  return 'OK';
}

(async () => {
  const creds = await login({ apiBase: API_BASE, tenantId: TENANT_ID, username: USERNAME, password: PASSWORD });
  const explicit = argOf(argv, 'routes', '');
  let routes = explicit
    ? explicit.split(',').map((s) => s.trim()).filter(Boolean)
    : ALL
      ? await fetchMenuPaths({
          apiBase: API_BASE,
          tenantId: TENANT_ID,
          token: creds.token,
          includeDashboards: INCLUDE_DASHBOARDS,
        })
      : DEFAULT_ROUTES;
  routes = [...new Set(routes)].slice(0, Math.max(MAX_ROUTES, DEFAULT_ROUTES.length));

  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installAuth(context, creds, TENANT_ID);
  const pages = [];

  console.log(`页面健康巡检  web=${WEB_BASE}  路由 ${routes.length} 条  并发 ${CONCURRENCY}`);
  const results = [];
  const failures = [];
  await runPool(routes, CONCURRENCY, async (route, workerIdx) => {
    if (!pages[workerIdx]) pages[workerIdx] = await context.newPage();
    const page = pages[workerIdx];
    const attempt = async () => {
      try {
        return await visit(page, route);
      } catch (e) {
        return {
          route,
          ms: 0,
          stalled: false,
          boundary: false,
          consoleErrors: [String(e).slice(0, 120)],
          http5xx: [],
          http4xx: [],
          softHttp: [],
          softConsole: [],
          blank: false,
        };
      }
    };
    let r = await attempt();
    let retried = false;
    // 断连类抖动（HMR/端口瞬断）会假红，失败页给一次重试机会；复测通过则记为 OK(重试)
    if (verdictOf(r) === 'FAIL' && RETRIES > 0) {
      retried = true;
      r = await attempt();
    }
    results.push({ ...r, retried });
    const verdict = verdictOf(r);
    if (verdict === 'FAIL') failures.push(r);
    const detail = [
      r.http5xx.length ? `5xx=${r.http5xx.length}` : '',
      r.consoleErrors.length ? `err=${r.consoleErrors.length}` : '',
      (r.http4xx.length || r.softHttp.length) ? `软=${r.http4xx.length + r.softHttp.length}` : '',
      r.boundary ? '边界' : '',
    ]
      .filter(Boolean)
      .join(' ');
    console.log(`  ${(verdict === 'OK' && r.retried ? 'OK(重试)' : verdict).padEnd(14)} ${route.padEnd(30)} ${String(r.ms).padStart(6)}ms  ${detail}`);
  });

  await browser.close();

  console.log(`\n汇总：检查 ${results.length} 页，失败 ${failures.length} 页`);
  for (const f of failures) {
    console.log(`  - ${f.route}`);
    for (const e of f.consoleErrors.slice(0, 3)) console.log(`      console: ${e}`);
    for (const e of f.http5xx.slice(0, 3)) console.log(`      http: ${e}`);
    if (f.boundary) console.log('      命中错误边界（页面白屏被兜住）');
    if (f.blank) console.log('      页面正文为空（白屏）');
  }
  console.log(failures.length ? '判定：FAIL' : '判定：OK');

  if (JSON_OUT) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(
      JSON_OUT,
      JSON.stringify({ web: WEB_BASE, at: new Date().toISOString(), results }, null, 2)
    );
    console.log(`明细已写入 ${JSON_OUT}`);
  }

  process.exit(failures.length ? 1 : 0);
})().catch((e) => {
  console.error('脚本级错误：', e && e.message ? e.message : e);
  process.exit(2);
});
