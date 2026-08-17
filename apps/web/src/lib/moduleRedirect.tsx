/**
 * 模块根路径重定向（防御裸段 /:mod 404）
 *
 * 背景：DynamicRoutes 只渲染模块内的具体路由（如 /crm/dashboard、/crm/customers），
 * 但不处理「用户手输 /crm」这种只有模块名的裸段 URL，会落到通配 NotFoundPage → 404 白屏。
 *
 * 用法：在 <Routes> 中 <Route path='/:mod' element={<ModRootRedirect />} />
 * 必须放在 path='*' 之前、具体模块路由之后。
 *
 * 策略：
 * 1. 优先用 loadModuleConfig(code)（内部有单例 + 加载缓存）
 * 2. 取 moduleConfig.routes[0].path 作为 landing 页
 * 3. 未知模块 → NotFoundPage（和原有行为一致，不误伤 404 语义）
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { loadModuleConfig } from '@/routes/v2';
import PageLoader from '@/components/PageLoader';
import NotFoundPage from '@/pages/shared/NotFoundPage';
import { logger } from '@/utils/logger';

type RedirectState = 'loading' | '404' | { target: string };

export function ModRootRedirect(): React.ReactElement {
  const { mod } = useParams<{ mod: string }>();
  const [state, setState] = useState<RedirectState>('loading');

  useEffect(() => {
    let cancelled = false;

    if (!mod) {
      setState('404');
      return;
    }

    loadModuleConfig(mod)
      .then((cfg) => {
        if (cancelled) return;
        const first = cfg?.routes?.[0]?.path;
        if (first && typeof first === 'string') {
          logger.info(`[ModRootRedirect] /${mod} → ${first}`);
          setState({ target: first });
        } else {
          logger.warn(`[ModRootRedirect] /${mod} no routes, render 404`);
          setState('404');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        logger.warn(`[ModRootRedirect] /${mod} resolve failed:`, err);
        setState('404');
      });

    return () => {
      cancelled = true;
    };
  }, [mod]);

  if (state === 'loading') return <PageLoader />;
  if (state === '404') return <NotFoundPage />;
  return (
    <Navigate
      to={state.target}
      replace
    />
  );
}

/**
 * 同步快速映射（给需要纯函数判断的调用方，如 prefetch / sideNav）。
 * 只做已知模块 code → first route path 的静态断言；未知返回 null。
 *
 * 注意：该 map 不需要与模块真实路由时刻一致，只是性能优化 hint；
 * 当此处返回 null 时，上层仍应回落异步 loadModuleConfig 解析。
 */
export const MODULE_ROOT_HINT: Readonly<Record<string, string>> = {
  // 以下仅为高频 code 的 hint，其余 code 一律走异步 loadModuleConfig 取路由首项
};

export function resolveModuleDashboardHint(code: string): string | null {
  return MODULE_ROOT_HINT[code] ?? null;
}

export default ModRootRedirect;
