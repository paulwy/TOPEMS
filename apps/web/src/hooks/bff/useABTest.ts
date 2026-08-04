/**
 * V45.0 Track D: A/B 测试 Hooks
 *
 * 提供 4 个 A/B 测试 Hook：
 * - useExperiment(experimentId)：获取当前用户分配的变体（自动分配）
 * - useTrackConversion(experimentId)：跟踪转化事件
 * - useExperimentResult(experimentId)：获取实验结果（转化率 + 显著性）
 * - useActiveExperiments()：获取活跃实验列表
 *
 * 自动从 authStore 获取当前用户 ID 与属性用于流量分配与定向。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  abTestEngine,
  type Experiment,
  type ExperimentResult,
  type Variant,
  type TargetingRule,
  type ExperimentMetric,
  ExperimentStatus,
} from '@/utils/bff/ab-testing';

/** 匿名用户 ID 的 localStorage key（未登录时使用） */
const ANON_USER_KEY = 'topems:abtest:anon-user-id';

/** 获取或生成匿名用户 ID */
function getAnonymousUserId(): string {
  if (typeof localStorage === 'undefined') return 'anon';
  let id = localStorage.getItem(ANON_USER_KEY);
  if (!id) {
    id = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(ANON_USER_KEY, id);
  }
  return id;
}

/** 从 authStore 提取用户属性（用于定向） */
function getUserAttributes(): Record<string, unknown> {
  const user = useAuthStore.getState().user;
  if (!user) return {};
  return {
    role: user.role,
    roles: user.roles,
    tenant_id: user.tenant_id,
    department: user.department,
    position: user.position,
    is_superuser: user.is_superuser ?? user.isSuperuser,
  };
}

/** 获取当前用户 ID（登录用户优先，否则匿名 ID） */
function getCurrentUserId(): string {
  const user = useAuthStore.getState().user;
  return user?.id ?? getAnonymousUserId();
}

// ==================== useExperiment ====================

/** useExperiment 配置项 */
export interface UseExperimentOptions {
  /** 用户属性（覆盖自动从 authStore 获取的属性） */
  userAttributes?: Record<string, unknown>;
  /** 是否启用自动分配，默认 true */
  autoAssign?: boolean;
}

/** useExperiment 返回值 */
export interface UseExperimentResult {
  /** 分配到的变体（未分配则为 null） */
  variant: Variant | null;
  /** 是否为对照组 */
  isControl: boolean;
  /** 变体配置 */
  config: Record<string, unknown> | null;
  /** 是否正在加载（分配中） */
  loading: boolean;
  /** 实验是否存在 */
  experimentExists: boolean;
  /** 实验状态 */
  experimentStatus: ExperimentStatus | null;
  /** 手动重新分配 */
  reassign: () => void;
}

/**
 * 获取当前用户在指定实验中分配的变体
 *
 * 自动从 authStore 获取用户 ID 与属性进行流量分配。
 * 同一用户在同一实验中始终获得同一变体（幂等）。
 *
 * @example
 * ```tsx
 * const { variant, config, isControl } = useExperiment('button-color-exp');
 * if (config?.color === 'red') {
 *   return <Button color="error">购买</Button>;
 * }
 * return <Button color="primary">购买</Button>;
 * ```
 */
export function useExperiment(
  experimentId: string,
  options: UseExperimentOptions = {}
): UseExperimentResult {
  const { userAttributes, autoAssign = true } = options;
  const [variant, setVariant] = useState<Variant | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = getCurrentUserId();
  const attributes = userAttributes ?? getUserAttributes();

  const assign = useCallback(() => {
    setLoading(true);
    const result = abTestEngine.assignVariant(experimentId, userId, attributes);
    setVariant(result);
    setLoading(false);
  }, [experimentId, userId, attributes]);

  useEffect(() => {
    if (autoAssign) {
      assign();
    } else {
      // 不自动分配时，仅查询已有分配
      const existing = abTestEngine.getAssignment(experimentId, userId);
      setVariant(existing);
      setLoading(false);
    }
  }, [autoAssign, assign, experimentId, userId]);

  // 订阅引擎变化（如实验状态变更）
  useEffect(() => {
    const unsubscribe = abTestEngine.onChange(() => {
      const current = abTestEngine.getAssignment(experimentId, userId);
      setVariant(current);
    });
    return () => {
      unsubscribe();
    };
  }, [experimentId, userId]);

  const experiment = abTestEngine.getExperiment(experimentId);

  return useMemo(
    () => ({
      variant,
      isControl: variant?.is_control ?? false,
      config: variant?.config ?? null,
      loading,
      experimentExists: experiment !== undefined,
      experimentStatus: experiment?.status ?? null,
      reassign: assign,
    }),
    [variant, loading, experiment, assign]
  );
}

// ==================== useTrackConversion ====================

/** useTrackConversion 返回值 */
export interface UseTrackConversionResult {
  /** 跟踪转化事件 */
  trackConversion: (metricName?: string, value?: number) => void;
  /** 当前用户是否已分配到实验 */
  isAssigned: boolean;
}

/**
 * 跟踪转化事件 Hook
 *
 * 记录当前用户在指定实验中的转化事件。
 * 若用户未分配到实验，则静默跳过。
 *
 * @example
 * ```tsx
 * const { trackConversion } = useTrackConversion('checkout-flow-exp');
 * <Button onClick={() => trackConversion('purchase')}>完成购买</Button>
 * ```
 */
export function useTrackConversion(experimentId: string): UseTrackConversionResult {
  const userId = getCurrentUserId();

  const trackConversion = useCallback(
    (metricName = 'conversion', value = 1) => {
      abTestEngine.trackConversion(experimentId, userId, metricName, value);
    },
    [experimentId, userId]
  );

  const isAssigned = abTestEngine.getAssignment(experimentId, userId) !== null;

  return { trackConversion, isAssigned };
}

// ==================== useExperimentResult ====================

/** useExperimentResult 返回值 */
export interface UseExperimentResultResult {
  /** 实验结果 */
  result: ExperimentResult | null;
  /** 是否统计显著 */
  isSignificant: boolean;
  /** 赢家变体 ID */
  winner: string | null;
  /** 是否正在计算 */
  loading: boolean;
  /** 重新计算结果 */
  refresh: () => void;
}

/**
 * 获取实验结果（转化率 + 显著性检验）
 *
 * @example
 * ```tsx
 * const { result, isSignificant, winner } = useExperimentResult('checkout-flow-exp');
 * if (isSignificant) {
 *   console.log(`赢家变体: ${winner}`);
 * }
 * ```
 */
export function useExperimentResult(experimentId: string): UseExperimentResultResult {
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(() => {
    setLoading(true);
    const r = abTestEngine.getResult(experimentId);
    setResult(r);
    setLoading(false);
  }, [experimentId]);

  useEffect(() => {
    compute();
  }, [compute]);

  // 订阅引擎变化（转化事件追加时重新计算）
  useEffect(() => {
    const unsubscribe = abTestEngine.onChange(() => {
      const r = abTestEngine.getResult(experimentId);
      setResult(r);
    });
    return () => {
      unsubscribe();
    };
  }, [experimentId]);

  return useMemo(
    () => ({
      result,
      isSignificant: result?.significance ?? false,
      winner: result?.winner ?? null,
      loading,
      refresh: compute,
    }),
    [result, loading, compute]
  );
}

// ==================== useActiveExperiments ====================

/** useActiveExperiments 返回值 */
export interface UseActiveExperimentsResult {
  /** 活跃实验列表（Running 状态） */
  experiments: Experiment[];
  /** 所有实验列表（含草稿/已完成） */
  allExperiments: Experiment[];
  /** 活跃实验数量 */
  count: number;
  /** 刷新列表 */
  refresh: () => void;
}

/**
 * 获取活跃实验列表
 *
 * @example
 * ```tsx
 * const { experiments, count } = useActiveExperiments();
 * console.log(`当前 ${count} 个活跃实验`);
 * ```
 */
export function useActiveExperiments(): UseActiveExperimentsResult {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [allExperiments, setAllExperiments] = useState<Experiment[]>([]);

  const refresh = useCallback(() => {
    setExperiments(abTestEngine.listExperiments(ExperimentStatus.RUNNING));
    setAllExperiments(abTestEngine.listExperiments());
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = abTestEngine.onChange(refresh);
    return () => {
      unsubscribe();
    };
  }, [refresh]);

  return useMemo(
    () => ({
      experiments,
      allExperiments,
      count: experiments.length,
      refresh,
    }),
    [experiments, allExperiments, refresh]
  );
}

// ==================== 实验管理 Hook ====================

/** 实验创建输入 */
export interface CreateExperimentInput {
  id?: string;
  name: string;
  description: string;
  variants: Array<{
    name: string;
    weight: number;
    is_control: boolean;
    config: Record<string, unknown>;
    id?: string;
  }>;
  traffic_allocation?: number;
  targeting?: TargetingRule[];
  metrics?: ExperimentMetric[];
}

/** useExperimentAdmin 返回值 */
export interface UseExperimentAdminResult {
  /** 创建实验 */
  createExperiment: (input: CreateExperimentInput) => Experiment;
  /** 启动实验 */
  startExperiment: (id: string) => Experiment;
  /** 暂停实验 */
  pauseExperiment: (id: string) => Experiment;
  /** 完成实验 */
  completeExperiment: (id: string) => Experiment;
  /** 删除实验 */
  deleteExperiment: (id: string) => boolean;
}

/**
 * 实验管理 Hook（用于管理面板）
 *
 * @example
 * ```tsx
 * const { createExperiment, startExperiment } = useExperimentAdmin();
 * createExperiment({ name: '按钮颜色', description: '...', variants: [...] });
 * ```
 */
export function useExperimentAdmin(): UseExperimentAdminResult {
  const createExperiment = useCallback((input: CreateExperimentInput) => {
    return abTestEngine.createExperiment(input);
  }, []);

  const startExperiment = useCallback((id: string) => {
    return abTestEngine.startExperiment(id);
  }, []);

  const pauseExperiment = useCallback((id: string) => {
    return abTestEngine.pauseExperiment(id);
  }, []);

  const completeExperiment = useCallback((id: string) => {
    return abTestEngine.completeExperiment(id);
  }, []);

  const deleteExperiment = useCallback((id: string) => {
    return abTestEngine.deleteExperiment(id);
  }, []);

  return {
    createExperiment,
    startExperiment,
    pauseExperiment,
    completeExperiment,
    deleteExperiment,
  };
}

export default useExperiment;
