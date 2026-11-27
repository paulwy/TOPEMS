import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EDGE_TOLERANT_TIMEOUT_MS,
  EDGE_TOLERANT_ENDPOINTS,
  isNavigationEndpoint,
} from '@/config/edgeTimeout';

/**
 * 边缘链路容错超时护栏（2026-11-27）
 *
 * 生产走 Cloudflare + cloudflared 隧道：单请求 p50≈0.6–1.4s、尾部可达 6s+，
 * 而前端全局超时是 5s。两个聚合端点（监控基础设施、BFF GraphQL）必须显式放宽，
 * 否则页面并发时会被链路抖动打成 `ECONNABORTED`，控制台一片红。
 */
const root = join(process.cwd(), 'src');

describe('EDGE_TOLERANT_TIMEOUT_MS', () => {
  it('足够宽松（≥10s），且明显高于全局 5s 默认', () => {
    expect(EDGE_TOLERANT_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
    expect(EDGE_TOLERANT_TIMEOUT_MS).toBeGreaterThan(5000);
  });

  it('覆盖两个已知聚合端点', () => {
    expect([...EDGE_TOLERANT_ENDPOINTS]).toEqual(['/infrastructure', '/graphql']);
  });
});

describe('调用点确实带上了宽松超时', () => {
  it('DashboardPage 的 /infrastructure 调用传 timeout', () => {
    const src = readFileSync(join(root, 'components/shared/DashboardPage.tsx'), 'utf-8');
    expect(src).toMatch(/\/infrastructure'?[^\n]*timeout: EDGE_TOLERANT_TIMEOUT_MS[\s\S]{0,80}\}/);
  });

  it('BFF 的两处 /graphql 调用都传 timeout', () => {
    const src = readFileSync(join(root, 'api/bff/index.ts'), 'utf-8');
    const posts = src.match(/'\/graphql', body/g) ?? [];
    const withTimeout =
      src.match(/'\/graphql', body, \{\s*timeout: EDGE_TOLERANT_TIMEOUT_MS/g) ?? [];
    expect(posts.length).toBe(2);
    expect(withTimeout.length).toBe(posts.length);
  });
});

describe('导航类端点放宽到 15s（2026-11-27）', () => {
  it('识别 /menus 与 /tenant/{id}/modules，且不误伤普通业务路径', () => {
    expect(isNavigationEndpoint('/menus')).toBe(true);
    expect(isNavigationEndpoint('/menus?x=1')).toBe(true);
    expect(isNavigationEndpoint('/tenant/00000000-0000-0000-0000-000000000001/modules')).toBe(true);
    expect(isNavigationEndpoint('/tenant/abc/modules?page=1')).toBe(true);
    expect(
      isNavigationEndpoint('/tenant/tenants/00000000-0000-0000-0000-000000000001/modules')
    ).toBe(true);
    expect(isNavigationEndpoint('/navigation-config')).toBe(true);
    expect(isNavigationEndpoint('/menus-extra')).toBe(false);
    expect(isNavigationEndpoint('/tenant/abc/users')).toBe(false);
    expect(isNavigationEndpoint('/flow/approvals')).toBe(false);
  });

  it('请求拦截器对导航端点覆盖为 EDGE_TOLERANT_TIMEOUT_MS', () => {
    const src = readFileSync(join(root, 'api/client.ts'), 'utf-8');
    expect(src).toMatch(
      /isNavigationEndpoint\(url\)[\s\S]{0,120}timeout = EDGE_TOLERANT_TIMEOUT_MS/
    );
  });
});
