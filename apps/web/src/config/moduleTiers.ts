/**
 * 业务域 tier 统一映射（批 13）
 *
 * 背景：`core_tenant_modules.module_code` 历史取值是 `erp:addressbook` / `pm:*` 这类
 * 功能级条目（前缀仅 erp / pm），与前端一级菜单的 36 个业务域 code 不是同一体系；
 * 按前缀做菜单过滤会把除 erp/pm 以外的模块全部隐藏。
 *
 * 统一口径（本次拍板）：
 *  - 一级权威 = 业务域 code（= `apps/web/src/modules/<domain>/config.ts` 顶层 code，
 *    也等于 `core_tenant_modules.module_code` 中 `:` 之前的前缀）；
 *  - module_code 统一为 `<domain>:<feature>` 两级；
 *  - tier 固定三级：basic / standard / enterprise（平台级统一映射，不做租户级自定义）。
 *
 * 变更本表即变更全平台套餐归属——请只在此处维护，不要在各页面重复声明。
 */

export type ModuleTier = 'basic' | 'standard' | 'enterprise';

/** 域 → tier 的权威映射（36 个业务域全覆盖，新增域必须先登记此处） */
export const DOMAIN_TIER_MAP: Readonly<Record<string, ModuleTier>> = {
  // ---- basic：平台基座 + 核心业务域 ----
  admin: 'basic',
  iam: 'basic',
  notification: 'basic',
  workflow: 'basic',
  doc: 'basic',
  erp: 'basic',
  mes: 'basic',
  wms: 'basic',
  scm: 'basic',
  crm: 'basic',
  finance: 'basic',
  asset: 'basic',
  hrm: 'basic',
  oa: 'basic',
  master: 'basic',

  // ---- standard：进阶业务域 + 分析/报表/移动 ----
  pm: 'standard',
  qms: 'standard',
  aps: 'standard',
  lims: 'standard',
  pdm: 'standard',
  srm: 'standard',
  tms: 'standard',
  ehs: 'standard',
  bi: 'standard',
  report: 'standard',
  mobile: 'standard',

  // ---- enterprise：集成/智能/监控/插件等增值能力 ----
  ai: 'enterprise',
  gis: 'enterprise',
  monitor: 'enterprise',
  plugin: 'enterprise',
  im: 'enterprise',
  integration: 'enterprise',
  automation: 'enterprise',
  rd: 'enterprise',
  registry: 'enterprise',
  ticket: 'enterprise',
};

/** 全部业务域 code（36） */
export const ALL_DOMAINS: string[] = Object.keys(DOMAIN_TIER_MAP);

/** 取某域 tier；未登记的域返回 null（调用方按"放行"处理，不误隐藏） */
export function tierOfDomain(domain: string): ModuleTier | null {
  return DOMAIN_TIER_MAP[domain] ?? null;
}

/** 某 tier 下的全部业务域 */
export function domainsOfTier(tier: ModuleTier): string[] {
  return ALL_DOMAINS.filter((d) => DOMAIN_TIER_MAP[d] === tier);
}

/** 从 module_code（`<domain>:<feature>`）取域前缀；无 `:` 时整体视为域 */
export function domainOfModuleCode(moduleCode: string): string {
  const idx = moduleCode.indexOf(':');
  return idx === -1 ? moduleCode : moduleCode.slice(0, idx);
}
