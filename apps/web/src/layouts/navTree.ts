import { useMemo } from 'react';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { ModuleCardConfig, NavItem } from '@/lib/navigation/types';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { L1_BUSINESS_DOMAINS, L2_TO_L1_MAP, L2_MODULE_ORDER } from './constants';
import i18n from '@/i18n';

export interface L1NavNode {
  key: string;
  title: string;
  order: number;
  icon: string;
  children: L2NavNode[];
}

export interface L2NavNode {
  key: string;
  title: string;
  icon: string;
  path: string;
  permission?: string;
  order: number;
  status?: string;
  description?: string;
  badge?: number | string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'error';
}

export interface NavTreeResult {
  l1Domains: L1NavNode[];
  l1KeysOrder: string[];
}

type PermissionChecker = (permission?: string) => boolean;

const SPECIAL_L1_MODULES: Record<
  string,
  Partial<L2NavNode> & { key: string; title: string; path: string }
> = {
  workbench_dashboard: {
    key: 'workbench_dashboard',
    title: i18n.t('shared.nav_tree.k0'),
    path: DASHBOARD_PATHS.dashboard,
    icon: 'Home',
    order: 1,
  },
  workbench_mobile: {
    key: 'mobile',
    title: i18n.t('shared.nav_tree.k1'),
    path: '/mobile/home',
    icon: 'Smartphone',
    order: 2,
  },
  profile_center: {
    key: 'profile_center',
    title: i18n.t('shared.nav_tree.k2'),
    path: DASHBOARD_PATHS.profile,
    icon: 'User',
    order: 1,
  },
  profile_favorites: {
    key: 'profile_favorites',
    title: i18n.t('shared.nav_tree.k3'),
    path: DASHBOARD_PATHS.favorites,
    icon: 'Bookmark',
    order: 2,
  },
};

function buildSpecialL2Nodes(l1Key: string, checkPermission: PermissionChecker): L2NavNode[] {
  const nodes: L2NavNode[] = [];

  if (l1Key === 'workbench') {
    const dashboard = SPECIAL_L1_MODULES.workbench_dashboard;
    if (checkPermission(undefined)) {
      nodes.push({
        key: dashboard.key,
        title: dashboard.title,
        path: dashboard.path,
        icon: dashboard.icon || 'Home',
        order: dashboard.order || 1,
      });
    }
  }

  if (l1Key === 'profile') {
    const profileCenter = SPECIAL_L1_MODULES.profile_center;
    const profileFavorites = SPECIAL_L1_MODULES.profile_favorites;
    if (checkPermission(undefined)) {
      nodes.push({
        key: profileCenter.key,
        title: profileCenter.title,
        path: profileCenter.path,
        icon: profileCenter.icon || 'User',
        order: profileCenter.order || 1,
      });
      nodes.push({
        key: profileFavorites.key,
        title: profileFavorites.title,
        path: profileFavorites.path,
        icon: profileFavorites.icon || 'Bookmark',
        order: profileFavorites.order || 2,
      });
    }
  }

  return nodes;
}

function moduleCardToL2Node(module: ModuleCardConfig): L2NavNode {
  const explicitOrder = L2_MODULE_ORDER[module.code];
  return {
    key: module.code,
    title: module.name,
    icon: module.icon,
    path: module.path,
    permission: module.permission,
    order: explicitOrder ?? module.order ?? 99,
    status: module.status,
    description: module.description,
    badge: module.status === 'beta' ? 'Beta' : module.status === 'new' ? 'New' : undefined,
  };
}

export function useNavTree(checkPermission: PermissionChecker): NavTreeResult {
  return useMemo(() => {
    const allModuleCodes = navigationRegistryV2.getAllModuleCodes();
    const l1Bucket: Record<string, L2NavNode[]> = {};

    L1_BUSINESS_DOMAINS.forEach((l1) => {
      l1Bucket[l1.key] = [];
    });

    allModuleCodes.forEach((code) => {
      const module = navigationRegistryV2.getModule(code);
      if (!module) return;
      if (module.status !== 'online' && module.status !== 'beta' && module.status !== 'new') return;
      if (module.permission && !checkPermission(module.permission)) return;

      const l1Key = L2_TO_L1_MAP[code];
      if (!l1Key || !l1Bucket[l1Key]) return;

      l1Bucket[l1Key].push(moduleCardToL2Node(module));
    });

    L1_BUSINESS_DOMAINS.forEach((l1) => {
      const specials = buildSpecialL2Nodes(l1.key, checkPermission);
      specials.forEach((s) => {
        if (l1Bucket[l1.key].every((n) => n.key !== s.key)) {
          l1Bucket[l1.key].push(s);
        }
      });

      l1Bucket[l1.key].sort((a, b) => a.order - b.order);
    });

    const l1Domains: L1NavNode[] = L1_BUSINESS_DOMAINS.filter(
      (l1) => l1Bucket[l1.key] && l1Bucket[l1.key].length > 0
    )
      .sort((a, b) => a.order - b.order)
      .map((l1) => ({
        key: l1.key,
        title: l1.title,
        order: l1.order,
        icon: l1.icon,
        children: l1Bucket[l1.key],
      }));

    const l1KeysOrder = l1Domains.map((d) => d.key);

    return { l1Domains, l1KeysOrder };
  }, [checkPermission]);
}

export function useFlatNavItems(checkPermission: PermissionChecker): NavItem[] {
  const { l1Domains } = useNavTree(checkPermission);

  return useMemo(() => {
    const items: NavItem[] = [];
    l1Domains.forEach((l1) => {
      l1.children.forEach((l2) => {
        items.push({
          code: l2.key,
          label: l2.title,
          icon: l2.icon,
          path: l2.path,
          permission: l2.permission,
          order: l2.order,
          moduleCode: l2.key,
          moduleName: l2.title,
          badge: l2.badge,
          badgeColor: l2.badgeColor,
          description: l2.description,
        });
      });
    });
    return items;
  }, [l1Domains]);
}

export function useDomainGroupedNavItems(
  checkPermission: PermissionChecker
): Record<string, NavItem[]> {
  const { l1Domains } = useNavTree(checkPermission);

  return useMemo(() => {
    const result: Record<string, NavItem[]> = {};
    l1Domains.forEach((l1) => {
      result[l1.key] = l1.children.map((l2) => ({
        code: l2.key,
        label: l2.title,
        icon: l2.icon,
        path: l2.path,
        permission: l2.permission,
        order: l2.order,
        moduleCode: l2.key,
        moduleName: l2.title,
        badge: l2.badge,
        badgeColor: l2.badgeColor,
        description: l2.description,
      }));
    });
    return result;
  }, [l1Domains]);
}
