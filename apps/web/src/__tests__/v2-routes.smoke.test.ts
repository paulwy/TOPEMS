/**
 * v2 动态路由机制单测（配置驱动页面加载路径）
 *
 * 覆盖 loadModuleConfig（加载/缓存/并发去重/未知模块报错）、getModuleRoutes
 * （路由扁平化）、findRouteByPathSync（路径匹配）、全量模块配置加载无失败
 * （31 个 coreModuleCodes 逐一加载，查配置加载链路问题）。
 */
import { describe, it, expect } from 'vitest';
import {
  loadModuleConfig,
  getModuleRoutes,
  findRouteByPathSync,
  coreModuleCodes,
} from '@/routes/v2';

describe('v2 动态路由机制', () => {
  it('核心模块配置加载成功且含非空 routes', async () => {
    for (const code of ['qms', 'crm', 'erp', 'wms', 'hrm', 'finance', 'iam']) {
      const cfg = await loadModuleConfig(code);
      expect(cfg, `${code} 配置缺失`).toBeTruthy();
      expect(Array.isArray(cfg.routes), `${code} routes 非数组`).toBe(true);
      expect(cfg.routes.length, `${code} routes 为空`).toBeGreaterThan(0);
    }
  });

  it('未知模块抛 not found', async () => {
    await expect(loadModuleConfig('no_such_module_xyz')).rejects.toThrow(/not found/);
  });

  it('缓存：重复加载返回同一配置引用', async () => {
    const a = await loadModuleConfig('qms');
    const b = await loadModuleConfig('qms');
    expect(a).toBe(b);
  });

  it('getModuleRoutes 返回扁平化路由且含 path 字段', async () => {
    const routes = await getModuleRoutes('qms');
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      expect(typeof r.path).toBe('string');
      expect(r.path.length).toBeGreaterThan(0);
    }
  });

  it('findRouteByPathSync 匹配已加载模块的路径', async () => {
    const routes = await getModuleRoutes('qms');
    const first = routes[0];
    expect(findRouteByPathSync(first.path)).toBeTruthy();
  });

  it('全量模块配置加载无失败（coreModuleCodes）', async () => {
    const failed: string[] = [];
    for (const code of coreModuleCodes) {
      try {
        const cfg = await loadModuleConfig(code);
        if (!cfg || !Array.isArray(cfg.routes)) {
          failed.push(`${code}(结构异常)`);
        }
      } catch (e) {
        failed.push(`${code}(${e instanceof Error ? e.message : String(e)})`);
      }
    }
    expect(failed, `加载失败模块: ${failed.join(' | ')}`).toHaveLength(0);
  }, 120000);
});
