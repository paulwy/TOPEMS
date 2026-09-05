/**
 * useUrlState — 将状态同步到 URL search params 的通用 Hook
 *
 * 作为所有 URL 同步功能的基础原语，可用于：
 * - tab 选中状态同步（?tab=active）
 * - 视图模式同步（?view=card）
 * - 展开/折叠状态同步（?expand=true）
 * - 任意简单值的 URL 持久化
 *
 * 支持 string / number / boolean / string[] / object 类型的自动序列化与解析。
 *
 * @example
 * ```tsx
 * const [tab, setTab] = useUrlState('tab', 'all');
 * const [view, setView] = useUrlState('view', 'table');
 * const [expanded, setExpanded] = useUrlState('expand', false);
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type UrlStateSetter<T> = (value: T | ((prev: T) => T), options?: { replace?: boolean }) => void;

function parseValue<T>(raw: string | null, defaultValue: T): T {
  if (raw === null) return defaultValue;

  if (typeof defaultValue === 'boolean') {
    return (raw === 'true') as unknown as T;
  }
  if (typeof defaultValue === 'number') {
    const n = Number(raw);
    return (Number.isFinite(n) ? n : defaultValue) as unknown as T;
  }
  if (Array.isArray(defaultValue)) {
    try {
      const parsed = JSON.parse(raw);
      return (Array.isArray(parsed) ? parsed : defaultValue) as unknown as T;
    } catch {
      return defaultValue;
    }
  }
  if (typeof defaultValue === 'object' && defaultValue !== null) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }
  return raw as unknown as T;
}

function serializeValue<T>(value: T): string {
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return String(value);
  }
  return JSON.stringify(value);
}

export function useUrlState<T>(
  key: string,
  defaultValue: T,
  options: {
    /** URL 更新模式：'replace'（默认）不产生历史记录，'push' 产生历史记录 */
    mode?: 'replace' | 'push';
    /** 值为默认值时是否从 URL 中移除，默认 true */
    removeDefault?: boolean;
  } = {}
): [T, UrlStateSetter<T>] {
  const { mode = 'replace', removeDefault = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const internalUpdateRef = useRef(false);

  const [state, setState] = useState<T>(() => {
    const raw = searchParams.get(key);
    return parseValue(raw, defaultValue);
  });

  const setStateAndUrl = useCallback<UrlStateSetter<T>>(
    (valueOrUpdater, opts) => {
      const replaceMode = opts?.replace ?? mode === 'replace';
      setState((prev) => {
        const nextValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prev: T) => T)(prev)
            : valueOrUpdater;

        internalUpdateRef.current = true;
        setSearchParams(
          (prevParams) => {
            const next = new URLSearchParams(prevParams);
            if (removeDefault && nextValue === defaultValue) {
              next.delete(key);
            } else {
              next.set(key, serializeValue(nextValue));
            }
            return next;
          },
          { replace: replaceMode }
        );
        requestAnimationFrame(() => {
          internalUpdateRef.current = false;
        });

        return nextValue;
      });
    },
    [key, defaultValue, mode, removeDefault, setSearchParams]
  );

  const searchParamsString = searchParams.toString();
  // 监听 URL 变化（前进/后退），同步回内部状态
  useEffect(() => {
    if (internalUpdateRef.current) return;
    const raw = searchParams.get(key);
    const parsed = parseValue(raw, defaultValue);
    setState((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(parsed)) return prev;
      return parsed;
    });
  }, [searchParamsString, defaultValue, key, searchParams]);

  return [state, setStateAndUrl];
}

export default useUrlState;
