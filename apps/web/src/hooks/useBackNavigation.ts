import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * 来源页状态信息
 */
export interface FromState {
  /** 来源页路径 */
  pathname: string;
  /** 来源页查询参数 */
  search?: string;
  /** 来源页自定义状态（如筛选条件、分页等） */
  customState?: Record<string, unknown>;
}

/**
 * useBackNavigation hook 返回值
 */
export interface BackNavigationResult {
  /** 来源页信息 */
  from: FromState | null;
  /** 是否有来源页信息 */
  hasFrom: boolean;
  /** 返回到来源页（或 fallback 路径） */
  goBack: (fallbackPath?: string) => void;
  /** 创建携带来源信息的跳转配置 */
  createNavigateState: (customState?: Record<string, unknown>) => { state: { from: FromState } };
  /** 获取来源页完整路径（pathname + search） */
  fromFullPath: string | null;
}

/**
 * 统一的返回导航 Hook
 *
 * 功能：
 * 1. 从 location.state 获取来源页信息
 * 2. 提供返回方法，优先返回来源页，fallback 到指定路径
 * 3. 支持携带来源页状态（如筛选条件、分页等）
 *
 * 使用示例：
 * ```tsx
 * // 列表页跳转详情页时携带来源信息
 * const { createNavigateState } = useBackNavigation();
 * navigate(`/hrm/employee/${id}`, createNavigateState({ page: 1, filter: 'active' }));
 *
 * // 详情页返回时智能返回来源页
 * const { goBack, fromFullPath } = useBackNavigation();
 * <Button onClick={() => goBack('/hrm/employees')}>返回</Button>
 * ```
 */
export function useBackNavigation(): BackNavigationResult {
  const navigate = useNavigate();
  const location = useLocation();

  // 从 location.state 获取来源信息
  const from = useMemo<FromState | null>(() => {
    const state = location.state as { from?: FromState } | undefined;
    if (state?.from) {
      return state.from;
    }
    return null;
  }, [location.state]);

  const hasFrom = from !== null;

  // 获取来源页完整路径
  const fromFullPath = useMemo<string | null>(() => {
    if (!from) return null;
    return from.search ? `${from.pathname}${from.search}` : from.pathname;
  }, [from]);

  // 返回到来源页（或 fallback 路径）
  const goBack = useCallback(
    (fallbackPath?: string) => {
      if (from) {
        // 优先返回来源页，并恢复来源页状态
        const targetPath = fromFullPath || from.pathname;
        navigate(targetPath, {
          replace: true,
          state: from.customState ? { restoredState: from.customState } : undefined,
        });
      } else if (fallbackPath) {
        // 使用 fallback 路径
        navigate(fallbackPath, { replace: true });
      } else {
        // 兜底：浏览器后退
        navigate(-1);
      }
    },
    [navigate, from, fromFullPath]
  );

  // 创建携带来源信息的跳转配置
  const createNavigateState = useCallback(
    (customState?: Record<string, unknown>) => {
      const fromState: FromState = {
        pathname: location.pathname,
        search: location.search,
        customState,
      };
      return { state: { from: fromState } };
    },
    [location.pathname, location.search]
  );

  return {
    from,
    hasFrom,
    goBack,
    createNavigateState,
    fromFullPath,
  };
}

export default useBackNavigation;
