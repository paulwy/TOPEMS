import React from 'react';
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * 特性开关状态
 */
export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  state: 'disabled' | 'enabled' | 'conditional';
  conditions?: FeatureCondition[];
}

/**
 * 特性开关上下文
 */
export interface FeatureFlagContext {
  tenantId?: string;
  userId?: string;
  environment: string;
}

/**
 * 特性开关条件
 */
export interface FeatureCondition {
  type: 'tenantWhitelist' | 'userWhitelist' | 'userPercentage' | 'environment';
  value: unknown;
}

/**
 * 特性开关检查结果
 */
export interface FeatureFlagResult {
  enabled: boolean;
  loading: boolean;
  error: Error | null;
}

// 全局特性开关缓存（从 API 懒加载）
let featureFlagsCache: Map<string, boolean> = new Map();
let cacheLoaded = false;

/**
 * 检查特性是否开启
 *
 * @param key - 特性开关标识
 * @param context - 上下文（可选，默认从 auth state 获取）
 * @returns FeatureFlagResult
 */
export function useFeatureFlag(
  key: string,
  context?: FeatureFlagContext
): FeatureFlagResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['feature-flags', key],
    queryFn: () => checkFeatureFlag(key, context),
    staleTime: 60_000, // 1分钟缓存
    enabled: !!key,
  });

  return {
    enabled: data ?? false,
    loading: isLoading,
    error: error,
  };
}

/**
 * 批量检查多个特性开关
 */
export function useFeatureFlags(
  keys: string[],
  context?: FeatureFlagContext
): Record<string, boolean> {
  const { data } = useQuery({
    queryKey: ['feature-flags-batch', keys.join(',')],
    queryFn: () => checkFeatureFlagsBatch(keys, context),
    staleTime: 60_000,
    enabled: keys.length > 0,
  });

  return data ?? {};
}

/**
 * 特性开关守卫组件
 *
 * 当特性开启时渲染 children，否则渲染 fallback
 */
export function FeatureGate({
  feature,
  context,
  children,
  fallback = null,
}: {
  feature: string;
  context?: FeatureFlagContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { enabled, loading } = useFeatureFlag(feature, context);

  if (loading) {
    return null;
  }

  return enabled ? React.createElement(React.Fragment, null, children) : React.createElement(React.Fragment, null, fallback);
}

// 内部 API 调用函数
async function checkFeatureFlag(
  key: string,
  context?: FeatureFlagContext
): Promise<boolean> {
  try {
    const response = await fetch('/api/core/feature-flags/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, context }),
    });
    const data = await response.json();
    return data.enabled ?? false;
  } catch {
    // 网络错误时返回 false
    return false;
  }
}

async function checkFeatureFlagsBatch(
  keys: string[],
  context?: FeatureFlagContext
): Promise<Record<string, boolean>> {
  try {
    const response = await fetch('/api/core/feature-flags/batch-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys, context }),
    });
    return await response.json();
  } catch {
    return {};
  }
}

export default useFeatureFlag;