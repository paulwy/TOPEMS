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
 * 单码判定：直接复用 `hasPermission`（批 15 已修正三段码精确判定），不再自建分支，
 * 避免两套判定逻辑漂移。
 */
function checkCode(permissions: string[], inherited: string[], code: string): boolean {
  // 后端超管权限集合为 ["*"]，与 "all" 同为通配；漏判会让超管的写按钮被误隐藏。
  if (permissions.includes('all') || permissions.includes('*')) return true;
  if (inherited.includes('all') || inherited.includes('*')) return true;
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
