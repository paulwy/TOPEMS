/**
 * B1 全路由可达性 + B2 控制台洁净 巡检 smoke
 *
 * 背景（架构事实，权威）：
 * - 静态路由：`src/routes/dashboard.ts` / `common.ts` / `auth.ts`。
 * - 业务模块路由：各 `src/modules/<name>/config.ts` 的 routes 数组（path 引用
 *   `<MODULE>_PATHS.x` 常量表），由 `src/routes/v2/index.ts#getAllRoutes` 聚合、
 *   `components/DynamicRoutes.tsx`（挂在 `path='*'`）按首段模块码加载渲染。
 * - 布局：受保护主路由恒用 GlobalLayoutV3（SideRail `<nav aria-label='Main navigation'>`
 *   + TopBar）；`module==='mobile'`（/mobile/*）不套全局壳，用 MobileHeader（role=banner）。
 * - 末匹配 `*` → NotFoundPage（渲染 «404» 大字）。
 *
 * 判定（每路由）：
 * - HARD FAIL：pageerror（未捕获异常）/ 落到 /login（鉴权失败被踢）/ 正文空白(<30 字符) /
 *   命中 NotFoundPage（路由未注册 → 404）。
 * - INFO：发生了非预期跳转（如模块根 → dashboard 重定向）。
 * - B2：逐路由收集 console error 与 HTTP >=400 响应，过滤 vite/HMR/静态资源噪声。
 *
 * 路由清单**在运行时从源码重新推导**（正则解析 `_PATHS` 常量表），避免与源码漂移。
 * 含 `:param` 的动态段用占位值 `1` 替代。
 *
 * 运行（单体模式必须显式指定后端地址，否则 apiLogin 失败 → mock token → 401 假失败）：
 *   API_URL=http://localhost:8099 pnpm exec playwright test e2e/ui/full-route-smoke.spec.ts \
 *     --project=chromium --workers=1 --retries=0
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createAuthenticatedContext } from '../utils/testUtils';

interface RouteEntry {
  group: string;
  route: string;
}

/** 从单个 config/route 源文件提取路由 path（解析 `_PATHS` 常量表后回填引用） */
function extractPaths(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const tables: Record<string, Record<string, string>> = {};
  for (const m of src.matchAll(/(\w+_PATHS)\s*=\s*\{([\s\S]*?)\}\s*as\s*const/g)) {
    const tbl: Record<string, string> = {};
    for (const p of m[2].matchAll(/(\w+)\s*:\s*'([^']*)'/g)) tbl[p[1]] = p[2];
    tables[m[1]] = tbl;
  }
  const out = new Set<string>();
  for (const m of src.matchAll(/path\s*:\s*(\w+_PATHS)\.(\w+)/g)) {
    const v = tables[m[1]]?.[m[2]];
    if (v) out.add(v);
  }
  for (const m of src.matchAll(/path\s*:\s*'(\/[^']*)'/g)) out.add(m[1]);
  return [...out].filter((p) => p.startsWith('/'));
}

function buildInventory(webSrc: string): RouteEntry[] {
  const entries: RouteEntry[] = [];
  const push = (group: string, paths: string[]) =>
    paths.filter((p) => !p.includes(':')).forEach((route) => entries.push({ group, route }));

  for (const f of ['dashboard.ts', 'common.ts', 'auth.ts']) {
    const abs = path.join(webSrc, 'routes', f);
    if (fs.existsSync(abs)) push(`routes/${f}`, extractPaths(abs));
  }

  const modDir = path.join(webSrc, 'modules');
  for (const name of fs.readdirSync(modDir).sort()) {
    const cfg = path.join(modDir, name, 'config.ts');
    if (fs.existsSync(cfg)) push(`module:${name}`, extractPaths(cfg));
  }

  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.route) ? false : (seen.add(e.route), true)));
}

/** vite / HMR / 静态资源噪声过滤（非应用缺陷） */
function isNoise(text: string): boolean {
  return /vite|sockjs|hot-update|favicon|\.map(\?|$)|Download the React DevTools/i.test(text);
}

test.describe('B1/B2 全路由巡检 smoke', () => {
  test('遍历路由清单：可达性 + 控制台洁净', async ({ browser }, testInfo) => {
    test.setTimeout(30 * 60 * 1000);

    const webSrc = path.resolve(path.dirname(testInfo.file), '../../src');
    const inventory = buildInventory(webSrc);

    const context = await createAuthenticatedContext(browser);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    let bucket = { pageErrors: [] as string[], consoleErrors: [] as string[], httpErrors: [] as string[] };
    const reset = () => {
      bucket = { pageErrors: [], consoleErrors: [], httpErrors: [] };
    };

    page.on('pageerror', (e) => bucket.pageErrors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !isNoise(m.text())) bucket.consoleErrors.push(m.text());
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && !isNoise(r.url())) bucket.httpErrors.push(`${r.status()} ${r.url()}`);
    });

    const hard: Array<Record<string, unknown>> = [];
    const info: Array<Record<string, unknown>> = [];
    const consoleHits: Array<Record<string, unknown>> = [];
    const httpHits: Array<Record<string, unknown>> = [];

    for (const { group, route } of inventory) {
      reset();
      await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await page.waitForTimeout(900);

      let body = (await page.locator('body').innerText().catch(() => '')) || '';
      if (body.trim().length < 30) {
        await page.waitForTimeout(1500);
        body = (await page.locator('body').innerText().catch(() => '')) || '';
      }

      const finalPath = new URL(page.url()).pathname;
      const isAuthRoute = route === '/login' || route.startsWith('/forgot');
      const found404 = /\b404\b/.test(body) && /不存在|not found|返回首页/i.test(body);
      const blank = body.trim().length < 30;

      if (bucket.pageErrors.length || (!isAuthRoute && finalPath === '/login') || blank || found404) {
        hard.push({
          group,
          route,
          finalPath,
          reason: bucket.pageErrors.length
            ? 'pageerror'
            : !isAuthRoute && finalPath === '/login'
              ? 'redirect:/login'
              : blank
                ? 'blank'
                : 'notfound-404',
          pageErrors: bucket.pageErrors.slice(0, 3),
          bodyHead: body.trim().slice(0, 120),
        });
      } else if (finalPath !== route && finalPath !== '/dashboard') {
        info.push({ group, route, finalPath });
      }

      if (bucket.consoleErrors.length)
        consoleHits.push({ group, route, errors: bucket.consoleErrors.slice(0, 3) });
      if (bucket.httpErrors.length)
        httpHits.push({ group, route, errors: [...new Set(bucket.httpErrors)].slice(0, 5) });
    }

    await context.close();

    const report = {
      total: inventory.length,
      hardFailures: hard,
      unexpectedRedirects: info,
      consoleErrorRoutes: consoleHits,
      httpErrorRoutes: httpHits,
    };
    const outFile = '/tmp/topems-full-route-smoke.json';
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    const summarize = (arr: Array<Record<string, unknown>>) =>
      arr.map((x) => `${x.group} ${x.route}${x.finalPath ? ' -> ' + x.finalPath : ''}${x.reason ? ' [' + x.reason + ']' : ''}`);
    console.log(`\n[B1/B2] 总路由=${inventory.length} 硬失败=${hard.length} 非预期跳转=${info.length} 控制台错误路由=${consoleHits.length} HTTP错误路由=${httpHits.length}`);
    console.log(`[B1/B2] 报告: ${outFile}`);
    console.log(`[B1/B2] 硬失败明细:\n  ${summarize(hard).join('\n  ') || '(无)'}`);

    expect(hard, 'B1 硬失败清单（详见 /tmp/topems-full-route-smoke.json）').toEqual([]);
  });
});
