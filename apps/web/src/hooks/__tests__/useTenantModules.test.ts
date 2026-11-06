import { describe, it, expect } from 'vitest';
import { collectActiveDomains, isModuleEffective, type TenantModuleRow } from '../useTenantModules';
import {
  DOMAIN_TIER_MAP,
  domainOfModuleCode,
  domainsOfTier,
  tierOfDomain,
} from '@/config/moduleTiers';

const NOW = Date.parse('2026-11-06T12:00:00Z');

describe('moduleTiers 业务域 tier 映射（批 13）', () => {
  it('三级 tier 全部有域归属，且总数为 36', () => {
    expect(Object.keys(DOMAIN_TIER_MAP).length).toBe(36);
    expect(domainsOfTier('basic').length).toBeGreaterThan(0);
    expect(domainsOfTier('standard').length).toBeGreaterThan(0);
    expect(domainsOfTier('enterprise').length).toBeGreaterThan(0);
    // 三级两两不重叠且并集等于全域
    const all = [
      ...domainsOfTier('basic'),
      ...domainsOfTier('standard'),
      ...domainsOfTier('enterprise'),
    ];
    expect(new Set(all).size).toBe(36);
  });

  it('核心业务域归 basic，集成/智能类归 enterprise', () => {
    expect(tierOfDomain('erp')).toBe('basic');
    expect(tierOfDomain('mes')).toBe('basic');
    expect(tierOfDomain('bi')).toBe('standard');
    expect(tierOfDomain('ai')).toBe('enterprise');
    expect(tierOfDomain('gis')).toBe('enterprise');
  });

  it('未登记域返回 null（调用方放行，不误隐藏）', () => {
    expect(tierOfDomain('unknown-domain')).toBeNull();
  });

  it('module_code 取域前缀', () => {
    expect(domainOfModuleCode('erp:addressbook')).toBe('erp');
    expect(domainOfModuleCode('mes:work_order')).toBe('mes');
    expect(domainOfModuleCode('mes')).toBe('mes');
  });
});

describe('collectActiveDomains 激活聚合（批 13）', () => {
  it('空数组 → null（无激活记录兜底放行）', () => {
    expect(collectActiveDomains([], NOW)).toBeNull();
    expect(collectActiveDomains(null, NOW)).toBeNull();
    expect(collectActiveDomains(undefined, NOW)).toBeNull();
  });

  it('全部未生效 → null（等同无记录）', () => {
    const rows: TenantModuleRow[] = [
      { module_code: 'mes:work_order', is_active: false },
      { module_code: 'erp:addressbook', expires_at: '2026-01-01T00:00:00Z' },
    ];
    expect(collectActiveDomains(rows, NOW)).toBeNull();
  });

  it('多模块聚合为业务域集合', () => {
    const rows: TenantModuleRow[] = [
      { module_code: 'mes:work_order', is_active: true },
      { module_code: 'mes:scheduling', is_active: true },
      { module_code: 'erp:addressbook', is_active: true },
    ];
    const domains = collectActiveDomains(rows, NOW);
    expect(domains).toEqual(new Set(['mes', 'erp']));
  });

  it('过滤已停用与已到期，保留未到期', () => {
    const rows: TenantModuleRow[] = [
      { module_code: 'wms:inbound', is_active: true, expires_at: '2027-01-01T00:00:00Z' },
      { module_code: 'scm:supplier', is_active: false },
      { module_code: 'crm:customer', expires_at: '2026-10-01T00:00:00Z' },
      { module_code: 'qms:inspection', is_active: true, expires_at: null },
    ];
    expect(collectActiveDomains(rows, NOW)).toEqual(new Set(['wms', 'qms']));
  });

  it('isModuleEffective 对异常到期时间放行', () => {
    expect(isModuleEffective({ module_code: 'x', expires_at: 'not-a-date' }, NOW)).toBe(true);
    expect(isModuleEffective({ module_code: 'x', is_active: false }, NOW)).toBe(false);
  });
});
