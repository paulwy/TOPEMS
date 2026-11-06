import { useCallback } from 'react';
import { hasPermission, hasPermissionWithInheritance } from '@/config/permissions';
import { logger } from '@/utils/logger';

/**
 * 无 AuthProvider 依赖的权限判定（批 14）
 *
 * 为什么需要它：`CrudPage` 被 280+ 页面复用，其中大量页面在单元测试里不挂 AuthProvider。
 * 若直接调用 `usePermission()`（内部 `useAuth()`），所有 CrudPage 测试都会抛
 * `useAuth must be used within AuthProvider`，一改就要 mock 数十个测试文件。
 *
 * 语义（与"不传即不过滤"一致）：
 * - 读不到权限信息（无缓存 / 未登录 / 首屏未加载）→ **返回 true（放行）**，绝不误隐藏按钮；
 * - 读到权限缓存 → 按 `hasPermission` / `hasPermissionWithInheritance` 判定（含 `:view` → `:read` 回退）。
 */

const PERMISSION_CACHE_KEY = 'permission_cache';
const CACHE_TTL = 5 * 60 * 1000;

interface PermissionCache {
  permissions: string[];
  inheritedPermissions: string[];
  timestamp: number;
}

function readPermissionCache(): PermissionCache | null {
  try {
    const raw = localStorage.getItem(PERMISSION_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as PermissionCache;
    if (!Array.isArray(cache.permissions)) return null;
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache;
  } catch (e) {
    logger.error('Failed to read permission cache:', e);
    return null;
  }
}

/** `:view` 等价回退到 `:read`（与 usePermission 的 P3 兼容层同源） */
function resolveAliases(permission: string): string[] {
  const parts = permission.split(':');
  if (parts.length === 3 && parts[2] === 'view') {
    return [permission, `${parts[0]}:${parts[1]}:read`];
  }
  return [permission];
}

/**
 * 单码判定。
 *
 * 注意：`hasPermission` 对三段码（`模块:资源:动作`，如 `scm:contract:delete`）会走
 * 等级近似分支——把 `contract` 当 action 查等级得 0，而模块内任何权限等级亦 ≥ 0，
 * 于是「该模块有任一权限即放行」（同模块 create 会放行 delete）。这是既有缺陷，
 * 已登记待专项评估；本 hook 不复用它：三段码只认精确命中与 `<模块>:<资源>:admin` 通配，
 * 二段码（`模块:动作`）仍按等级继承判定。
 */
function checkCode(permissions: string[], inherited: string[], code: string): boolean {
  if (permissions.includes('all') || inherited.includes('all')) return true;
  if (permissions.includes(code) || inherited.includes(code)) return true;
  const parts = code.split(':');
  if (parts.length >= 3) {
    return permissions.includes(`${parts[0]}:${parts[1]}:admin`);
  }
  return hasPermissionWithInheritance(inherited, code) || hasPermission(permissions, code);
}

/**
 * @returns (permissionCode?) => boolean；未传码恒为 true
 */
export function useOptionalPermission(): (permission?: string) => boolean {
  return useCallback((permission?: string): boolean => {
    if (!permission) return true;
    const cache = readPermissionCache();
    if (!cache) return true;
    const inherited = Array.isArray(cache.inheritedPermissions) ? cache.inheritedPermissions : [];
    return resolveAliases(permission).some((code) => checkCode(cache.permissions, inherited, code));
  }, []);
}
