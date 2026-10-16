import { describe, it, expect, vi, beforeAll } from 'vitest';

/**
 * 回归：MONO 内建模式下，插件同步流程（pluginApi.listInstalled 返回空数组）
 * 不得把内建模块（含 source='plugin' 的专业模块，如 bi）从 navigationRegistryV2 注销。
 *
 * 背景：lib/navigation/index.ts 已统一注册全部内建模块；PluginManager.syncNavigationRegistry
 * 此前会对“不在服务器插件列表”的模块执行 unregisterModule，导致 /bi/data-analysis 等
 * 页面级路径无法命中注册表，面包屑落入 URL 段 fallback 输出英文 "Data Analysis"。
 */
vi.mock('@/api/plugin', () => ({
  pluginApi: {
    listInstalled: vi.fn().mockResolvedValue({ data: [] }),
    install: vi.fn().mockResolvedValue(null),
    uninstall: vi.fn().mockResolvedValue(null),
  },
  pluginApiAggregated: {
    listInstalled: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/api/plugin/marketplace', () => ({
  pluginAxios: {
    get: vi.fn().mockRejectedValue(new Error('no plugin server in test')),
  },
}));

import { navigationRegistryV2 } from '@/lib/navigation';
import { pluginManager } from '@/lib/plugin-loader/pluginManager';

describe('MONO 内建模式：插件空列表同步不注销内建模块', () => {
  beforeAll(async () => {
    // 触发完整插件加载流程：listInstalled=[] → processInstalledPlugins([]) →
    // syncNavigationRegistry（fetchNavigationConfig 失败降级后执行注销循环）
    await pluginManager.initialize();
  });

  it('bi 模块在插件同步后仍然注册', () => {
    expect(navigationRegistryV2.getModule('bi')).toBeDefined();
  });

  it('/bi/data-analysis 在插件同步后仍可被 findNavItemByPath 命中', () => {
    const item = navigationRegistryV2.findNavItemByPath('/bi/data-analysis');
    expect(item).toBeDefined();
    expect(item?.code).toBe('bi-data-analysis');
  });

  it('面包屑层级在插件同步后仍可解析（bi → bi-data-analysis）', () => {
    const hierarchy = navigationRegistryV2.getNavHierarchy('/bi/data-analysis');
    const codes = hierarchy.map((i) => i.code).filter(Boolean);
    expect(codes).toContain('bi-data-analysis');
  });

  it('核心模块（如 qms）在插件同步后仍然注册', () => {
    expect(navigationRegistryV2.getModule('qms')).toBeDefined();
  });
});
