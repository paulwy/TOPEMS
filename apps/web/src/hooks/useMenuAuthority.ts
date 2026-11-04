import { useEffect, useState } from 'react';
import { fetchMyMenus, type DbMenuItem } from '@/api/core/menus';

export type MenuAuthorityMode = 'db' | 'config';
export type MenuAuthorityStatus = 'loading' | 'db' | 'fallback' | 'config';

/**
 * 运行时开关：`?menu_authority=db|config` 优先，其次 `VITE_MENU_AUTHORITY`，
 * 默认 `db`（DB 为权威）。接口失败或显式为 config 时回退现有 config 声明。
 */
export function resolveMenuAuthorityMode(): MenuAuthorityMode {
  if (typeof window === 'undefined') return 'db';
  const params = new URLSearchParams(window.location.search);
  const env = (import.meta.env as Record<string, string | undefined>).VITE_MENU_AUTHORITY;
  const raw = (params.get('menu_authority') ?? env ?? 'db').trim().toLowerCase();
  return raw === 'config' ? 'config' : 'db';
}

/** 将后端返回的树拍平成 code → item（子项同样参与侧边栏渲染）。 */
function flattenMenuTree(items: DbMenuItem[], out: Map<string, DbMenuItem>): void {
  for (const item of items) {
    if (!item?.code) continue;
    out.set(item.code, item);
    if (item.children?.length) flattenMenuTree(item.children, out);
  }
}

export interface MenuAuthorityState {
  mode: MenuAuthorityMode;
  status: MenuAuthorityStatus;
  dbMenus: Map<string, DbMenuItem> | null;
}

export function useMenuAuthority(): MenuAuthorityState {
  const mode = resolveMenuAuthorityMode();
  const [status, setStatus] = useState<MenuAuthorityStatus>(
    mode === 'config' ? 'config' : 'loading'
  );
  const [dbMenus, setDbMenus] = useState<Map<string, DbMenuItem> | null>(null);

  useEffect(() => {
    if (mode !== 'db') {
      setDbMenus(null);
      setStatus('config');
      return;
    }

    let cancelled = false;
    const load = async () => {
      // 失败重试 1 次（共 2 次尝试），仍失败则回退 config，绝不白屏。
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const data = await fetchMyMenus();
          if (cancelled) return;
          const map = new Map<string, DbMenuItem>();
          flattenMenuTree(data.items ?? [], map);
          if (map.size > 0) {
            setDbMenus(map);
            setStatus('db');
          } else {
            // 后端可用但 DB 无数据：视为不可用，回退 config
            setDbMenus(null);
            setStatus('fallback');
          }
          return;
        } catch {
          if (cancelled) return;
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }
      if (!cancelled) {
        setDbMenus(null);
        setStatus('fallback');
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return { mode, status, dbMenus };
}
