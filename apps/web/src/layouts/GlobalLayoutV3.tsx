import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Home, LayoutGrid } from 'lucide-react';
import { AppShell } from '../components/redesign/layout/AppShell';
import type { NavItem } from '../components/redesign/layout/SideRail';
import { usePermission } from '../hooks/usePermission';
import {
  useUnreadNotificationCount,
  useSetUnreadNotificationCount,
} from '@/store/notificationBadgeStore';
import { getUnreadCount } from '@/api/notification';
import { navigationRegistryV2 } from '@/lib/navigation';
import { lucideIcons } from '@/lib/iconMapping';
import { DOMAIN_GROUPS } from '@/config/moduleTiers';
import { NOTIFICATION_PATHS } from '@/module-configs/notification/config';
import type { DbMenuItem } from '@/api/core/menus';
import { useMenuAuthority } from '@/hooks/useMenuAuthority';
import { useTenantModules } from '@/hooks/useTenantModules';
import i18n, { ensureNamespacesLoaded, subscribeResourceVersion, getResourceVersion } from '@/i18n';

/**
 * GlobalLayoutV3 — Industrial OS 全局布局
 *
 * 使用 AppShell（TopBar + SideRail）替换旧的 GlobalLayout / SmartLayout。
 * 定案（2026-10-16）：主路由恒用本布局，原 VITE_UI_V3_ENABLED 灰度开关已移除。
 *
 * 特性：
 * - 统一的 Industrial OS 视觉语言
 * - 响应式侧边栏导航
 * - 顶部栏集成用户菜单、通知、设置
 * - 命令面板入口（后续接入）
 */
export interface GlobalLayoutV3Props {
  children: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * 顶栏模块展示顺序：仅用于稳定排序，不决定菜单内容。
 * 菜单内容、权限、图标、路径均来自 navigationRegistryV2，新增模块会自动出现。
 */
const MODULE_ORDER: readonly string[] = [
  'mes',
  'erp',
  'scm',
  'srm',
  'crm',
  'qms',
  'ehs',
  'lims',
  'wms',
  'tms',
  'bi',
  'gis',
  'doc',
  'im',
  'notification',
  'oa',
  'workflow',
  'ticket',
  'hrm',
  'finance',
  'admin',
  'pm',
  'rd',
  'asset',
  'pdm',
  'aps',
  'ai',
  'automation',
  'integration',
  'monitor',
  'report',
  'master',
  'iam',
  'plugin',
  'mobile',
];

const MODULE_ORDER_INDEX = new Map(MODULE_ORDER.map((code, index) => [code, index]));

/** 图标名 → Lucide 组件；未知图标统一回退为 LayoutGrid，避免渲染崩溃 */
function resolveIcon(iconName?: string): LucideIcon {
  const icon = iconName ? lucideIcons[iconName] : null;
  return (icon as LucideIcon | null) ?? LayoutGrid;
}

/** 订阅 i18n 资源版本，命名空间异步注入后重新生成菜单文案 */
function useI18nResourceVersion(): number {
  return useSyncExternalStore(subscribeResourceVersion, getResourceVersion);
}

/**
 * 由导航注册表动态生成侧边栏菜单。
 * 模块级权限由 getTopNavItems 过滤；子项权限由 getSidebarNavItems 过滤。
 * 配置了子菜单但用户无任何子项权限时隐藏整组（与旧版权限过滤行为一致）。
 */
function buildSidebarItems(
  checkPermission: (permission: string) => boolean,
  unreadCount: number,
  dbMenus: Map<string, DbMenuItem> | null,
  activeDomains: Set<string> | null = null
): NavItem[] {
  // P2-1 mobile 模块 Web 侧隐藏：mobile 为移动端专用入口（MobileNav 独立渲染，
  // 移动端导航仍展示），Web 侧边栏不再显示 mobile 模块组。
  const registryItems = navigationRegistryV2
    .getTopNavItems(checkPermission)
    .filter((item) => item.code !== 'mobile')
    // 批 13：租户激活业务域过滤。activeDomains 为 null（无激活记录/接口不可用/加载中）
    // 时兜底放行，不过滤任何模块；未在 moduleTiers 登记的域同样放行，避免误隐藏。
    .filter((item) => !activeDomains || activeDomains.has(item.code))
    .slice()
    .sort((a, b) => {
      const orderA = MODULE_ORDER_INDEX.get(a.code) ?? Number.MAX_SAFE_INTEGER;
      const orderB = MODULE_ORDER_INDEX.get(b.code) ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
      return a.code.localeCompare(b.code);
    });

  const items: NavItem[] = [
    {
      id: 'dashboard',
      label: i18n.t('shared.sidebar.dashboard'),
      icon: Home,
      path: '/dashboard',
    },
  ];

  // 批 29：模块级入口先收集到 moduleItems，再按 DOMAIN_GROUPS 聚合成一级域组
  const moduleItems: NavItem[] = [];

  for (const moduleItem of registryItems) {
    const moduleConfig = navigationRegistryV2.getModule(moduleItem.code);
    // P2-2 dashboard 下沉模块首页：dashboard 入口不占侧边栏菜单（路由与
    // 模块 Tab 保留，进入模块仍由 /<mod>/dashboard 作为 landing 页），
    // 消除 35+ 个 dashboard 冗余入口。
    const configuredChildren = (moduleConfig?.navItems ?? []).filter(
      (item) => item.showInSidebar !== false && !item.code.endsWith('-dashboard')
    );
    const children = navigationRegistryV2
      .getSidebarNavItems(moduleItem.code, checkPermission)
      .filter((child) => {
        if (!dbMenus) return true;
        const dbItem = dbMenus.get(child.code);
        return Boolean(dbItem) && dbItem?.visible !== false;
      })
      .slice()
      .sort((a, b) => {
        if (!dbMenus) return 0;
        const orderA = dbMenus.get(a.code)?.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = dbMenus.get(b.code)?.order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      })
      .map<NavItem>((child) => {
        const dbItem = dbMenus?.get(child.code);
        const labelKey =
          dbItem?.titleKey && i18n.exists(dbItem.titleKey) ? dbItem.titleKey : child.labelKey;
        return {
          id: `${moduleItem.code}:${child.code}`,
          label: labelKey ? i18n.t(labelKey) : child.label,
          icon: resolveIcon(dbItem?.icon || child.icon),
          path: dbItem?.path || child.path,
          // P2-2：把 navItems 的 group 语义带到渲染层，由 SideRail 按
          // NavGroup 标准顺序聚合成可折叠的二级分组
          group: child.group,
        };
      });

    // 配置了二级菜单但全部被权限过滤掉：不展示空组
    if (configuredChildren.length > 0 && children.length === 0) {
      continue;
    }

    moduleItems.push({
      id: moduleItem.code,
      label: moduleItem.labelKey ? i18n.t(moduleItem.labelKey) : moduleItem.label,
      icon: resolveIcon(moduleItem.icon),
      path: moduleItem.path,
      badge: moduleItem.code === 'notification' && unreadCount > 0 ? unreadCount : undefined,
      children: children.length > 0 ? children : undefined,
    });
  }

  // 批 29：一级菜单由 35 个业务域收敛为 10 个业务域组。
  // 只做呈现分组——不改 route path、不改权限码、不改模块内部结构：
  // 一级 = 域组，二级 = 组内模块，三级 = 模块 navItems（SidebarNavGroup 递归渲染）。
  const groupedCodes = new Set(DOMAIN_GROUPS.flatMap((group) => group.domains));
  const moduleByCode = new Map(moduleItems.map((entry) => [entry.id, entry]));

  const groupedItems: NavItem[] = [];
  for (const group of DOMAIN_GROUPS) {
    const groupChildren = group.domains
      .map((domain) => moduleByCode.get(domain))
      .filter((entry): entry is NavItem => Boolean(entry));
    if (groupChildren.length === 0) continue;
    groupedItems.push({
      id: `group:${group.code}`,
      label: i18n.t(group.labelKey),
      icon: resolveIcon(group.icon),
      // 组头默认指向组内首个模块入口；有 children 时点击为展开/折叠（SidebarNavGroup）
      path: groupChildren[0].path,
      children: groupChildren,
    });
  }

  // 未在 DOMAIN_GROUPS 登记的域兜底：保持原样平铺为一级入口，不隐藏
  const ungroupedItems = moduleItems.filter((entry) => !groupedCodes.has(entry.id));

  items.push(...groupedItems, ...ungroupedItems);

  return items;
}

// 底部菜单项已移除：系统设置在左侧"系统管理"二级菜单，个人中心在右上角头像下拉菜单
const footerItems: NavItem[] = [];

export const GlobalLayoutV3: React.FC<GlobalLayoutV3Props> = ({ children, fullWidth = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // P1-4 前端权限守卫：侧边栏菜单按权限过滤（无权限的模块组/入口不展示）
  const { checkPermission } = usePermission();
  const resourceVersion = useI18nResourceVersion();
  // Phase 1：默认优先消费 DB 菜单接口；?menu_authority=config 或接口失败时回退 config。
  const { dbMenus } = useMenuAuthority();
  // 批 13：租户模块激活状态（决定一级业务域是否展示）
  const { activeDomains } = useTenantModules();

  // P5: 未读数轮询写入 store，消息中心徽标实时跟随；无未读时徽标自动隐藏
  const unreadCount = useUnreadNotificationCount();
  const setUnread = useSetUnreadNotificationCount();

  // 侧边栏会一次性展示全部模块，预先加载其导航文案命名空间，避免未访问模块
  // 的菜单名显示成原始 i18n key（如 mes.nav.module_name）
  useEffect(() => {
    const namespaces = new Set<string>();
    // 批 29：一级域组名走独立 domain-group 命名空间，与模块命名空间一并预加载
    namespaces.add('domain-group');
    navigationRegistryV2.getAllModules().forEach((module) => {
      const keys = [module.nameKey, ...module.navItems.map((item) => item.labelKey)];
      keys.forEach((key) => {
        const namespace = key?.split('.')[0];
        if (namespace) namespaces.add(namespace);
      });
    });
    void ensureNamespacesLoaded([...namespaces]).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await getUnreadCount();
        if (!cancelled && res.success) {
          setUnread(typeof res.data === 'number' ? res.data : Number(res.data) || 0);
        }
      } catch {
        // 接口不可用时保持当前值，不打断渲染
      }
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [setUnread]);

  // 菜单内容完全由 navigationRegistryV2 动态生成：
  // P1-4：模块/子项权限均在 registry 查询时过滤；未读数注入 notification 组徽标
  const items = useMemo<NavItem[]>(
    () => buildSidebarItems(checkPermission, unreadCount, dbMenus, activeDomains),
    // resourceVersion 变化代表模块命名空间翻译已异步注入，需要重新解析 label
    [checkPermission, unreadCount, resourceVersion, dbMenus]
  );

  // 根据当前路径计算激活的导航项（优先匹配子菜单，再匹配模块组）
  const activeId = useMemo(() => {
    const allItems: { id: string; path?: string }[] = [];
    items.forEach((item) => {
      if (item.children) {
        item.children.forEach((child) => {
          allItems.push({ id: child.id, path: child.path });
        });
      }
      allItems.push({ id: item.id, path: item.path });
    });

    // 精确匹配
    const exactMatch = allItems.find((item) => item.path === location.pathname);
    if (exactMatch) {
      return exactMatch.id;
    }

    // 前缀匹配
    for (const item of allItems) {
      if (item.path && location.pathname.startsWith(`${item.path}/`)) {
        return item.id;
      }
    }

    return 'dashboard';
  }, [items, location.pathname]);

  const handleItemClick = (id: string) => {
    // 扁平化所有菜单项，查找对应的 path
    const allItems: { id: string; path?: string }[] = [];
    items.forEach((item) => {
      allItems.push({ id: item.id, path: item.path });
      if (item.children) {
        item.children.forEach((child) => {
          allItems.push({ id: child.id, path: child.path });
        });
      }
    });

    const item = allItems.find((item) => item.id === id);
    const path = item?.path || '/dashboard';
    navigate(path);
  };

  // TopBar 按钮处理函数
  const handleCommandOpen = () => {
    console.info('Command palette opened');
  };

  const handleNotificationsOpen = () => {
    navigate(NOTIFICATION_PATHS.list);
  };

  const handleSettingsOpen = () => {
    navigate('/admin/system-settings');
  };

  const handleProfileOpen = () => {
    navigate('/profile');
  };

  return (
    <AppShell
      title='TOPEMS'
      items={items}
      activeId={activeId}
      onItemClick={handleItemClick}
      footerItems={footerItems}
      fullWidth={fullWidth}
      onCommandOpen={handleCommandOpen}
      onNotificationsOpen={handleNotificationsOpen}
      onSettingsOpen={handleSettingsOpen}
      onProfileOpen={handleProfileOpen}
    >
      {children}
    </AppShell>
  );
};

export default GlobalLayoutV3;
