import { useMemo, useSyncExternalStore } from 'react';
import { navigationRegistryV2 } from './NavigationRegistryV2';
import type { NavItem } from './types';
import { useLocation } from 'react-router-dom';
import { subscribeResourceVersion, getResourceVersion } from '@/i18n';

/**
 * 订阅 i18n 资源版本号：ensureNamespacesLoaded 异步注入翻译后，
 * useMemo 缓存（依赖仅 pathname）不会重算，导致面包屑/导航 label
 * 停留在注入前的旧翻译。这里把资源版本纳入依赖，资源更新即重算。
 */
function useI18nResourceVersion(): number {
  return useSyncExternalStore(subscribeResourceVersion, getResourceVersion);
}

export function useNavHierarchy(): NavItem[] {
  const location = useLocation();
  const resourceVersion = useI18nResourceVersion();

  return useMemo(() => {
    return navigationRegistryV2.getNavHierarchy(location.pathname);
  }, [location.pathname, resourceVersion]);
}

export function useCurrentNavItem(): NavItem | undefined {
  const location = useLocation();
  const resourceVersion = useI18nResourceVersion();

  return useMemo(() => {
    return navigationRegistryV2.findNavItemByPath(location.pathname);
  }, [location.pathname, resourceVersion]);
}
