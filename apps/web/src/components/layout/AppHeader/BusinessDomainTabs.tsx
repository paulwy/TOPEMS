import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation';
import { SUITE_GROUPS } from '@/lib/navigation/types';
import type { ModuleCardConfig, ModuleSuite } from '@/lib/navigation/types';
import { TabGroup, type TabItem } from '@/components/ui/Tabs';
import { renderIcon } from '@/lib/iconMapping';
import i18n from '@/i18n';

interface BusinessDomainTabsProps {
  /** 权限校验函数（透传 usePermission().checkPermission） */
  checkPermission?: (permission: string) => boolean;
  /** 默认业务域（无路径匹配时的兜底高亮） */
  defaultDomain?: ModuleSuite | 'other';
  /** 是否允许未标注模块归入“其他”域，默认 true */
  includeOther?: boolean;
}

/**
 * L1 业务域 Tab 条（设计基准：navigation-menu-demo.design 顶部域导航）
 *
 * - 数据源：`navigationRegistryV2.getNavItemsGroupedByBusinessDomain()`
 * - 排序：`SUITE_GROUPS.order`（enterprise → manufacturing → … → platform）
 * - 交互：点击切换业务域并跳转该域首个模块首页；下划线滑动动画（`TabGroup`）
 * - 高亮：根据当前路由所属模块的 `suite` 自动定位，无匹配时保持上次选择
 * - 响应式：`< md` 隐藏（由 AppHeader 在移动端折叠/汉堡菜单承接）
 */
export const BusinessDomainTabs: React.FC<BusinessDomainTabsProps> = ({
  checkPermission,
  defaultDomain = 'enterprise',
  includeOther = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const grouped = useMemo(
    () => navigationRegistryV2.getNavItemsGroupedByBusinessDomain(checkPermission),
    [checkPermission]
  );

  const domains = useMemo(() => {
    const list = Object.keys(grouped).filter((d) => includeOther || d !== 'other') as Array<
      ModuleSuite | 'other'
    >;
    return list.sort((a, b) => {
      const oa = SUITE_GROUPS[a as keyof typeof SUITE_GROUPS]?.order ?? 999;
      const ob = SUITE_GROUPS[b as keyof typeof SUITE_GROUPS]?.order ?? 999;
      return oa - ob;
    });
  }, [grouped, includeOther]);

  // 当前路由所属业务域（无匹配时保持上次选择）
  const [fallbackDomain, setFallbackDomain] = useState<ModuleSuite | 'other'>(defaultDomain);

  useEffect(() => {
    const module = navigationRegistryV2.findModuleByPath(location.pathname);
    if (module?.suite) {
      setFallbackDomain(module.suite);
    }
  }, [location.pathname]);

  const activeDomain = useMemo(() => {
    const module = navigationRegistryV2.findModuleByPath(location.pathname);
    return module?.suite ?? fallbackDomain;
  }, [location.pathname, fallbackDomain]);

  const handleDomainChange = useCallback(
    (domainKey: string) => {
      const modules = grouped[domainKey];
      const first = modules?.[0];
      if (first?.path) {
        setFallbackDomain(domainKey as ModuleSuite | 'other');
        navigate(first.path);
      }
    },
    [grouped, navigate]
  );

  const items = useMemo<TabItem[]>(
    () =>
      domains.map((domain) => {
        const info = SUITE_GROUPS[domain as keyof typeof SUITE_GROUPS];
        const modules = grouped[domain] ?? [];
        const firstModule: ModuleCardConfig | undefined = modules[0];
        return {
          key: domain,
          label: info ? i18n.t(info.labelKey, { defaultValue: info.label }) : String(domain),
          icon: info?.icon ? renderIcon(info.icon, 16) : undefined,
          disabled: !firstModule?.path,
        };
      }),
    [domains, grouped]
  );

  if (domains.length === 0) return null;

  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        minWidth: 0,
        flex: '0 1 auto',
      }}
    >
      <TabGroup
        items={items}
        value={activeDomain}
        onChange={handleDomainChange}
        label={i18n.t('shared.business_domain_tabs.k0', { defaultValue: 'Business domains' })}
        scrollable
      />
    </Box>
  );
};

export default BusinessDomainTabs;
