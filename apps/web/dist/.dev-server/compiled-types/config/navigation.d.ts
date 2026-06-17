export type { NavMenuItem, NavGroup, TabItem, ModuleTabsConfig, } from "@/types/navigation";
export { topNavItems, moduleTabsConfig, getModuleTabs, getModuleFromPath, } from "./navigation-v2";
import type { NavGroup as NavigationNavGroup } from "@/types/navigation";
export type NavItem = NavigationNavGroup;
export interface LegacyNavGroup {
    title?: string;
    items: NavigationNavGroup[];
}
