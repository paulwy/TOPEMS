/**
 * 治理仪表盘 Hook
 *
 * 提供 AI 治理仪表盘的数据获取和状态管理，包括：
 * - 治理仪表盘数据
 * - 治理评分
 * - 风险评估
 * - 合规状态
 * - 成本分析
 * - 性能指标
 * - 趋势数据
 * - 建议和改进项
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getGovernanceDashboard,
  getGovernanceScore,
  getRiskAssessment,
  getComplianceStatus,
  getCostAnalysis,
  getPerformanceMetrics,
  getKeyMetrics,
  getSecurityEvents,
  getAuditSummary,
  getTrends,
  getRecommendations,
  refreshDashboardCache,
  type GovernanceDashboardData,
  type TimeRange,
  type RiskLevel,
  type RecommendationPriority,
  type SecurityEventSummary,
} from '@/api/ai/governance-dashboard';

// ============================================================================
// Hook 状态
// ============================================================================

interface UseGovernanceDashboardState {
  /** 是否加载中 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 仪表盘数据 */
  dashboard: GovernanceDashboardData | null;
  /** 当前时间范围 */
  timeRange: TimeRange;
  /** 是否自动刷新 */
  autoRefresh: boolean;
  /** 刷新间隔（毫秒） */
  refreshInterval: number;
  /** 最后刷新时间 */
  lastRefreshed: Date | null;
}

// ============================================================================
// Hook 返回值
// ============================================================================

interface UseGovernanceDashboardReturn extends UseGovernanceDashboardState {
  /** 加载仪表盘数据 */
  loadDashboard: (timeRange?: TimeRange) => Promise<GovernanceDashboardData | null>;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 切换时间范围 */
  setTimeRange: (range: TimeRange) => void;
  /** 设置自动刷新 */
  setAutoRefresh: (enabled: boolean) => void;
  /** 清除缓存并刷新 */
  clearCacheAndRefresh: () => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useGovernanceDashboard(
  initialTimeRange: TimeRange = '24h',
  autoRefresh = false,
  refreshInterval = 300000 // 5 分钟
): UseGovernanceDashboardReturn {
  const [state, setState] = useState<UseGovernanceDashboardState>({
    isLoading: false,
    error: null,
    dashboard: null,
    timeRange: initialTimeRange,
    autoRefresh,
    refreshInterval,
    lastRefreshed: null,
  });

  /** 加载仪表盘数据 */
  const loadDashboard = useCallback(async (timeRange?: TimeRange) => {
    const range = timeRange || state.timeRange;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const response = await getGovernanceDashboard(range);
      if (response.data) {
        setState((s) => ({
          ...s,
          dashboard: response.data!,
          isLoading: false,
          lastRefreshed: new Date(),
        }));
        return response.data;
      }
      throw new Error('Failed to load dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((s) => ({ ...s, error: message, isLoading: false }));
      return null;
    }
  }, [state.timeRange]);

  /** 刷新数据 */
  const refresh = useCallback(async () => {
    await loadDashboard();
  }, [loadDashboard]);

  /** 切换时间范围 */
  const setTimeRange = useCallback((range: TimeRange) => {
    setState((s) => ({ ...s, timeRange: range }));
  }, []);

  /** 设置自动刷新 */
  const setAutoRefresh = useCallback((enabled: boolean) => {
    setState((s) => ({ ...s, autoRefresh: enabled }));
  }, []);

  /** 清除缓存并刷新 */
  const clearCacheAndRefresh = useCallback(async () => {
    try {
      await refreshDashboardCache();
      await loadDashboard();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((s) => ({ ...s, error: message }));
    }
  }, [loadDashboard]);

  /** 清除错误 */
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  // 自动刷新
  useEffect(() => {
    if (!state.autoRefresh) return;

    const interval = setInterval(() => {
      loadDashboard();
    }, state.refreshInterval);

    return () => clearInterval(interval);
  }, [state.autoRefresh, state.refreshInterval, loadDashboard]);

  // 初始加载
  useEffect(() => {
    loadDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    loadDashboard,
    refresh,
    setTimeRange,
    setAutoRefresh,
    clearCacheAndRefresh,
    clearError,
  };
}

export default useGovernanceDashboard;
