import { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import { domainOfModuleCode } from '@/config/moduleTiers';

/** `core_tenant_modules` 行（后端 list_tenant_modules 返回） */
export interface TenantModuleRow {
  module_code: string;
  is_active?: boolean;
  expires_at?: string | null;
}

export interface TenantModulesState {
  /**
   * 当前租户已激活的业务域集合。
   * `null` = 兜底放行（接口不可用 / 无激活记录 / 尚未加载完成），此时不过滤任何模块，
   * 保证存量租户与接口故障场景下菜单不会凭空消失。
   */
  activeDomains: Set<string> | null;
  status: 'loading' | 'active' | 'fallback';
}

/** 生效判定（拍板口径）：is_active 且（无到期时间 或 未到期） */
export function isModuleEffective(row: TenantModuleRow, now: number = Date.now()): boolean {
  if (row.is_active === false) return false;
  if (!row.expires_at) return true;
  const expiresAt = Date.parse(row.expires_at);
  if (Number.isNaN(expiresAt)) return true;
  return expiresAt > now;
}

/** 把激活记录聚合成业务域集合；空集合视为"无激活记录"→ 返回 null 走兜底放行 */
export function collectActiveDomains(
  rows: readonly TenantModuleRow[] | null | undefined,
  now: number = Date.now()
): Set<string> | null {
  if (!rows || rows.length === 0) return null;
  const effective = rows.filter((row) => isModuleEffective(row, now));
  if (effective.length === 0) return null;
  const domains = new Set<string>();
  for (const row of effective) {
    const domain = domainOfModuleCode(row.module_code);
    if (domain) domains.add(domain);
  }
  return domains.size > 0 ? domains : null;
}

function currentTenantId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('current_tenant_id');
}

/**
 * 租户激活模块（批 13）：菜单按业务域可见性收敛的数据源。
 *
 * 任何异常路径（无 tenant id、接口失败、空数据、无生效记录）都回落
 * `activeDomains = null`（放行），与拍板"无激活记录租户兜底放行、一次性生效、不做灰度开关"一致。
 */
export function useTenantModules(): TenantModulesState {
  const [activeDomains, setActiveDomains] = useState<Set<string> | null>(null);
  const [status, setStatus] = useState<TenantModulesState['status']>('loading');

  useEffect(() => {
    let cancelled = false;
    const tenantId = currentTenantId();
    if (!tenantId) {
      setActiveDomains(null);
      setStatus('fallback');
      return;
    }

    const load = async () => {
      try {
        const response = await apiClient.core.get<TenantModuleRow[]>(
          `/tenant/tenants/${tenantId}/modules`
        );
        if (cancelled) return;
        const rows = response?.success ? response.data : null;
        if (!rows) throw new Error(response?.message || 'tenant modules request failed');
        const domains = collectActiveDomains(rows);
        setActiveDomains(domains);
        setStatus(domains ? 'active' : 'fallback');
      } catch {
        if (cancelled) return;
        setActiveDomains(null);
        setStatus('fallback');
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { activeDomains, status };
}
