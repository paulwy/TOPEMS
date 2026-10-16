import { describe, it, expect, beforeAll } from 'vitest';
import { navigationRegistryV2 } from '@/lib/navigation';
import i18n, { ensureLanguageLoaded } from '@/i18n';

/**
 * 回归测试：/bi/data-analysis 面包屑显示 "Data Analysis"（英文 PascalCase）缺陷。
 *
 * 根因：bi 为 source='plugin' 的专业模块，插件市场 API 返回空数组导致运行时未注册进
 * navigationRegistryV2；useAutoBreadcrumbs 的 findNavItemByPath/getNavHierarchy 无法命中
 * 页面级路径，落入 URL 段 fallback 的 formatSegmentLabel('data-analysis') → "Data Analysis"。
 *
 * 修复：MONO 内建模式下将 coreModuleNavConfigs（含 bi 等 15 个专业模块）统一注册。
 * 本测试验证注册后 registry 可命中 /bi/data-analysis，且 zh 翻译正确解析为「销售分析」。
 */
describe('BI 面包屑 registry 命中修复', () => {
  beforeAll(async () => {
    // lib/navigation index 已在模块顶层注册全部内建模块（本次修复）
    await ensureLanguageLoaded('zh');
    if (i18n.language !== 'zh') {
      i18n.changeLanguage('zh');
    }
  });

  it('registry 命中 /bi/data-analysis 页面级 nav item', () => {
    const item = navigationRegistryV2.findNavItemByPath('/bi/data-analysis');
    expect(item).toBeDefined();
    expect(item!.code).toBe('bi-data-analysis');
    expect(item!.labelKey).toBe('bi.nav.bi-data-analysis');
    expect(item!.path).toBe('/bi/data-analysis');

    // getNavHierarchy 也需命中：模块 → 叶子
    const hierarchy = navigationRegistryV2.getNavHierarchy('/bi/data-analysis');
    expect(hierarchy.length).toBe(2);
    expect(hierarchy[0].code).toBe('bi');
    expect(hierarchy[0].labelKey).toBe('bi.nav.module_name');
    expect(hierarchy[1].code).toBe('bi-data-analysis');
    expect(hierarchy[1].labelKey).toBe('bi.nav.bi-data-analysis');
  });

  it('zh 资源下 label 解析为「销售分析」而非英文 PascalCase', () => {
    const item = navigationRegistryV2.findNavItemByPath('/bi/data-analysis');
    expect(item).toBeDefined();
    // 修复前：registry 未命中 → formatSegmentLabel('data-analysis') → "Data Analysis"
    // 修复后：命中 nav item → i18n.t('bi.nav.bi-data-analysis')
    expect(item!.label).toBe('销售分析');
    expect(i18n.t('bi.nav.bi-data-analysis')).toBe('销售分析');
  });

  it('bi 模块已注册进 registry（getTopNavItems / getModule）', () => {
    const module = navigationRegistryV2.getModule('bi');
    expect(module).toBeDefined();
    const topItems = navigationRegistryV2.getTopNavItems(() => true);
    expect(topItems.some((i) => i.code === 'bi')).toBe(true);
  });
});
