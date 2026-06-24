// 导航配置文件
// 从 navigation-v2.ts 导入新配置，保持向后兼容

// 导出类型定义（从 types/navigation.ts）
export type { NavMenuItem, NavGroup, TabItem, ModuleTabsConfig } from '@/types/navigation';

// 导出导航配置（从 navigation-v2.ts）
export { topNavItems, moduleTabsConfig, getModuleTabs, getModuleFromPath } from './navigation-v2';

import type { NavGroup as NavigationNavGroup } from '@/types/navigation';

// 兼容旧版本的 NavItem 类型（已更名为 NavGroup）
export type NavItem = NavigationNavGroup;

// 兼容旧版本的 NavGroup 类型（带 title 和 items）
export interface LegacyNavGroup {
  title?: string;
  items: NavigationNavGroup[];
}
