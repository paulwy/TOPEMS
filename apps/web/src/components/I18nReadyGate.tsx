import React, { useState, useEffect, useRef, useCallback } from 'react';
import PageLoader from './PageLoader';
import {
  i18nReady,
  registerI18nForceUpdate,
  hasPendingResourceUpdate,
  clearPendingResourceUpdate,
} from '@/i18n';
import { pluginManager } from '@/lib/plugin-loader/PluginManager';
import { ensureShortcutsLoaded } from '@/store/shortcutsStore';

interface I18nReadyGateProps {
  children: React.ReactNode;
}

/**
 * i18n 翻译就绪门禁组件
 *
 * 两个核心作用：
 * 1. 在首次渲染前等待 i18n bootstrap（root + BOOTSTRAP_NAMESPACES）完成，
 *    防止 Dashboard 等核心页面出现原始 key 闪烁。
 * 2. 注册全局 forceUpdate 回调：当 ensureNamespacesLoaded 动态注入翻译时，
 *    所有使用 i18n.t() 直接调用的组件也能立即拿到最新翻译，无需改用 useTranslation。
 *
 * 使用 requestAnimationFrame 防抖：将同一帧内多个 resourcesAdded 事件合并为一次
 * 重渲染，防止 installNamespaceResources 顺序加载多命名空间时触发的级联重渲染
 * 导致 Maximum update depth exceeded 错误。
 */
const I18nReadyGate: React.FC<I18nReadyGateProps> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [_version, forceRender] = useState(0);
  const mountedRef = useRef(true);
  const rafIdRef = useRef<number | null>(null);
  const pendingRef = useRef(false);

  const scheduleForceUpdate = useCallback(() => {
    pendingRef.current = true;
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (pendingRef.current && mountedRef.current) {
        pendingRef.current = false;
        forceRender((n) => n + 1);
      }
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    i18nReady
      .then(() => {
        if (mountedRef.current) {
          setReady(true);
          // Refresh plugin names now that i18n resources are loaded
          pluginManager.refreshPluginNames();
          ensureShortcutsLoaded();
          if (hasPendingResourceUpdate()) {
            clearPendingResourceUpdate();
            scheduleForceUpdate();
          }
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setReady(true);
        }
      });

    const unregister = registerI18nForceUpdate(() => {
      if (mountedRef.current) {
        scheduleForceUpdate();
      }
    });

    return () => {
      mountedRef.current = false;
      unregister();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scheduleForceUpdate]);

  if (!ready) {
    return <PageLoader />;
  }

  return <>{children}</>;
};

export default I18nReadyGate;
