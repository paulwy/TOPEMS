/**
 * useDynamicOptions — 字段级动态选项加载 Hook
 *
 * 用于 Schema 中需要从 API 加载的 select/autocomplete 字段选项。
 * 基于 React Query 实现缓存、依赖刷新。
 *
 * 优化：每个字段独立使用 useQuery，实现字段级精细缓存与失效。
 * 字段级 queryKey 可通过 DynamicOptionConfig.queryKey 自定义，
 * 未指定时自动使用 `['dynamic-options', field, dependencies]`。
 *
 * @example
 * ```tsx
 * const options = useDynamicOptions(schema.dynamicOptions);
 * // options['warehouse_id'] = [{ value: 'wh-1', label: '北京仓' }, ...]
 * ```
 */

import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import type { DynamicOptionConfig } from '@/schema';

export interface DynamicOptionsResult {
  [fieldName: string]: {
    options: { value: string; label: string }[];
    loading: boolean;
    error: unknown | null;
  };
}

function buildQueryKey(
  config: DynamicOptionConfig,
  dependencies?: Record<string, unknown>
): unknown[] {
  if (config.queryKey) return config.queryKey;
  const depsKey = dependencies
    ? JSON.stringify(dependencies)
    : config.dependencies
      ? JSON.stringify(config.dependencies)
      : 'default';
  return ['dynamic-options', config.field, depsKey];
}

/**
 * 批量加载多个字段的动态选项
 *
 * 使用 useQueries 为每个字段创建独立查询，实现字段级精细缓存与失效：
 * - 某个字段的 dependencies 变化时，只会重查该字段
 * - 某个字段的缓存失效不会影响其他字段
 * - 支持通过 DynamicOptionConfig.queryKey 自定义 queryKey
 */
export function useDynamicOptions(
  configs: DynamicOptionConfig[] | undefined,
  dependencies?: Record<string, unknown>
): DynamicOptionsResult {
  const queryConfigs = useMemo(() => {
    if (!configs || configs.length === 0) return [];
    return configs.map((config) => ({
      queryKey: buildQueryKey(config, dependencies),
      queryFn: () => config.loader(dependencies),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    }));
  }, [configs, dependencies]);

  const results: UseQueryResult<unknown>[] = useQueries({ queries: queryConfigs });

  const result = useMemo<DynamicOptionsResult>(() => {
    const obj: DynamicOptionsResult = {};
    if (!configs) return obj;
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const r = results[i];
      obj[config.field] = {
        options: (r?.data as { value: string; label: string }[]) || [],
        loading: r?.isLoading ?? false,
        error: r?.error ?? null,
      };
    }
    return obj;
  }, [configs, results]);

  return result;
}

/**
 * 将动态选项合并到 FormFieldConfig 数组中
 */
export function mergeDynamicOptions<T extends { options?: unknown }>(
  fields: T[],
  dynamicOptions: DynamicOptionsResult
): T[] {
  return fields.map((field) => {
    const dynamic = dynamicOptions[(field as any).name];
    if (dynamic?.options.length > 0) {
      return { ...field, options: dynamic.options } as T;
    }
    return field;
  });
}
