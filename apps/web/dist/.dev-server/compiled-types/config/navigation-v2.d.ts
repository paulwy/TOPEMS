import type { NavGroup, TabItem, ModuleTabsConfig } from "@/types/navigation";
/**
 * Header全局导航配置
 * 首页入口简化为唯一入口，不展开
 */
export declare const topNavItems: NavGroup[];
/**
 * 模块Tab配置
 * 每个模块入口页展示模块Tab，用于模块内页面切换
 */
export declare const moduleTabsConfig: ModuleTabsConfig[];
/**
 * 根据模块名获取Tab配置
 */
export declare function getModuleTabs(module: string): TabItem[];
/**
 * 根据路径获取模块名
 */
export declare function getModuleFromPath(path: string): string | null;
