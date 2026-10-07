import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';
import apiClient from '@/api/client';

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
interface FeatureFlagContext {
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
interface FeatureFlagResult {
  enabled: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * 检查特性是否开启
 *
 * @param key - 特性开关标识
 * @param context - 上下文（可选，默认从 auth state 获取）
 * @returns FeatureFlagResult
 */
function useFeatureFlag(key: string, context?: FeatureFlagContext): FeatureFlagResult {
  const { data, isPending, error } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.FEATURE_FLAGS_BASE, key],
    queryFn: () => checkFeatureFlag(key, context),
    staleTime: 60_000, // 1分钟缓存
    enabled: !!key,
  });

  return {
    enabled: data ?? false,
    loading: isPending,
    error,
  };
}

// 内部 API 调用函数（走统一 axios 拦截器：token 注入 / 401 / 重试 / trace）
async function checkFeatureFlag(key: string, context?: FeatureFlagContext): Promise<boolean> {
  try {
    // feature-flags/check 直接返回 { enabled }（无 ApiResponse 包装）
    const res = await apiClient.core.post<{ enabled?: boolean }>('/feature-flags/check', {
      key,
      context,
    });
    return (res as unknown as { enabled?: boolean }).enabled ?? false;
  } catch {
    // 网络错误时返回 false
    return false;
  }
}

export default useFeatureFlag;
