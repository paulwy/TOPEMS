/**
 * Phase 5.2 — 跨模块数据获取 Hook
 *
 * 安全地从关联模块获取数据，当模块未安装时返回 null 而不是报错。
 */
import { useState, useEffect, useCallback } from 'react';
import { usePlugins } from '@/context/PluginContext';
import i18n from '@/i18n';

export interface UseModuleDataOptions<T> {
  /** 目标模块 code */
  moduleCode: string;
  /** 数据获取函数（仅在模块已安装时调用） */
  fetchFn: () => Promise<T>;
  /** 自动获取（默认 true） */
  autoFetch?: boolean;
  /** 依赖数组 */
  deps?: unknown[];
}

export interface UseModuleDataResult<T> {
  /** 数据（模块未安装时为 null） */
  data: T | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 目标模块是否已安装 */
  isAvailable: boolean;
  /** 手动重新获取 */
  refetch: () => void;
}

export function useModuleData<T>({
  moduleCode,
  fetchFn,
  autoFetch = true,
  deps = [],
}: UseModuleDataOptions<T>): UseModuleDataResult<T> {
  const { isPluginInstalled } = usePlugins();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = isPluginInstalled(moduleCode);

  const refetch = useCallback(async () => {
    if (!isAvailable) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err: unknown) {
      const errAny = err as { response?: { data?: { message?: string } }; message?: string };
      const message =
        errAny?.response?.data?.message || errAny?.message || i18n.t('shared.use_module_data.k0');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAvailable, fetchFn]);

  useEffect(() => {
    if (autoFetch) {
      refetch();
    }
  }, [autoFetch, refetch, ...deps]);

  return { data, loading, error, isAvailable, refetch };
}

export default useModuleData;
