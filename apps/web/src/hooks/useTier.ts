/**
 * useTier Hook
 *
 * 从租户上下文获取当前订阅层级（plan tier），
 * 并提供模块可用性判断、菜单过滤等工具函数。
 *
 * # 使用示例
 *
 * ```tsx
 * const { tier, isModuleAvailable, filterModules } = useTier();
 *
 * // 检查模块是否可用
 * if (!isModuleAvailable('ai')) {
 *   return <Navigate to="/403" />;
 * }
 *
 * // 过滤菜单
 * const visibleMenus = filterModules(menus);
 * ```
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  PlanTier,
  parsePlanTier,
  isModuleAvailable,
  isPathAvailable,
  filterModulesByTier,
  getModulesForTier,
  getModulesNotForTier,
  getModuleMinTier,
  type ModuleFeature,
} from '@/lib/tier';

export { PlanTier };
export type { ModuleFeature };

/** localStorage 中存储 plan 的 key */
const PLAN_STORAGE_KEY = 'current_tenant_plan';

/**
 * 后端 plan 字段到前端 PlanTier 的映射
 *
 * 后端 Tenant.plan 可能的值：free / basic / pro / enterprise
 * 前端 PlanTier：free / basic / advanced
 *
 * 映射规则：
 * - free → free
 * - basic → basic
 * - pro → advanced
 * - enterprise → advanced
 * - 其他/未设置 → basic（默认）
 */
function mapBackendPlanToTier(plan: string | null | undefined): PlanTier {
  if (!plan) return PlanTier.Basic;
  switch (plan.toLowerCase()) {
    case 'free':
      return PlanTier.Free;
    case 'basic':
      return PlanTier.Basic;
    case 'pro':
    case 'enterprise':
    case 'advanced':
      return PlanTier.Advanced;
    default:
      return PlanTier.Basic;
  }
}

/** 从 localStorage 获取当前 plan */
function getStoredPlan(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PLAN_STORAGE_KEY);
}

/** 保存 plan 到 localStorage */
export function setCurrentPlan(plan: string | null): void {
  if (typeof window === 'undefined') return;
  if (plan) {
    localStorage.setItem(PLAN_STORAGE_KEY, plan);
  } else {
    localStorage.removeItem(PLAN_STORAGE_KEY);
  }
  // 触发自定义事件，通知所有 useTier 实例更新
  window.dispatchEvent(new CustomEvent('plan-changed', { detail: { plan } }));
}

/** useTier Hook 返回值 */
export interface UseTierReturn {
  /** 当前订阅层级 */
  tier: PlanTier;
  /** 原始 plan 字符串（来自后端） */
  rawPlan: string | null;
  /** 检查模块是否对当前层级可用 */
  isModuleAvailable: (module: string) => boolean;
  /** 检查路径是否属于可用模块 */
  isPathAvailable: (path: string) => boolean;
  /** 过滤模块列表，只保留可用模块 */
  filterModules: <T extends { module?: string; path?: string }>(
    modules: T[],
    getModule?: (item: T) => string,
  ) => T[];
  /** 获取当前层级可用的所有模块定义 */
  availableModules: ModuleFeature[];
  /** 获取当前层级不可用的所有模块定义 */
  unavailableModules: ModuleFeature[];
  /** 获取模块的最低层级要求 */
  getModuleMinTier: (module: string) => PlanTier | null;
  /** 是否为高级版 */
  isAdvanced: boolean;
  /** 是否为基础版及以上 */
  isBasicOrAbove: boolean;
  /** 是否为免费版 */
  isFree: boolean;
}

/**
 * useTier Hook
 *
 * 从 localStorage 获取当前订阅层级（plan tier），
 * 并提供模块可用性判断、菜单过滤等工具函数。
 *
 * # 使用示例
 *
 * ```tsx
 * const { tier, isModuleAvailable, filterModules } = useTier();
 *
 * // 检查模块是否可用
 * if (!isModuleAvailable('ai')) {
 *   return <Navigate to="/403" />;
 * }
 *
 * // 过滤菜单
 * const visibleMenus = filterModules(menus);
 * ```
 */
export function useTier(): UseTierReturn {
  const [rawPlan, setRawPlan] = useState<string | null>(getStoredPlan);

  // 监听 plan 变化事件
  useEffect(() => {
    const handlePlanChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ plan: string | null }>;
      setRawPlan(customEvent.detail?.plan ?? getStoredPlan());
    };
    window.addEventListener('plan-changed', handlePlanChanged);
    // 监听 storage 事件（多标签页同步）
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PLAN_STORAGE_KEY) {
        setRawPlan(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('plan-changed', handlePlanChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const tier = useMemo(() => mapBackendPlanToTier(rawPlan), [rawPlan]);

  const isModuleAvailableFn = useCallback(
    (module: string) => isModuleAvailable(module, tier),
    [tier],
  );

  const isPathAvailableFn = useCallback(
    (path: string) => isPathAvailable(path, tier),
    [tier],
  );

  const filterModulesFn = useCallback(
    <T extends { module?: string; path?: string }>(
      modules: T[],
      getModule?: (item: T) => string,
    ) => filterModulesByTier(modules, tier, getModule),
    [tier],
  );

  const availableModules = useMemo(() => getModulesForTier(tier), [tier]);
  const unavailableModules = useMemo(() => getModulesNotForTier(tier), [tier]);

  return {
    tier,
    rawPlan,
    isModuleAvailable: isModuleAvailableFn,
    isPathAvailable: isPathAvailableFn,
    filterModules: filterModulesFn,
    availableModules,
    unavailableModules,
    getModuleMinTier,
    isAdvanced: tier === PlanTier.Advanced,
    isBasicOrAbove: tier !== PlanTier.Free,
    isFree: tier === PlanTier.Free,
  };
}

export default useTier;
