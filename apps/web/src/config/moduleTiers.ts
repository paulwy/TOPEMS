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

// ============================================================================
// 域分组（批 29）：一级菜单由 35 个业务域收敛为 10 个业务域组
// ============================================================================
//
// 背景：侧边栏此前把 35 个 `apps/web/src/modules/<domain>` 全部平铺为一级入口，
// 域多时首屏扫读成本高。本层只做【呈现分组】，不改任何 route path、权限码或模块
// 内部结构：一级 = 10 个域组，二级 = 组内模块，三级 = 模块内 navItems。
//
// 维护约定（与 DOMAIN_TIER_MAP 相同）：新增业务域必须在此登记，否则该域不会
// 出现在任何一级组（渲染层对未分组域兜底回退为独立一级入口，不会隐藏）。
//
// 单一定位原则：一个域只归属一个组，跨组语义模糊者按主业务归属，不重复挂载。

/** 一级业务域组 */
export type DomainGroupCode =
  | 'manufacturing'
  | 'supplychain'
  | 'finance'
  | 'hr'
  | 'rd'
  | 'quality'
  | 'asset'
  | 'platform'
  | 'analytics'
  | 'collab';

export interface DomainGroupDef {
  code: DomainGroupCode;
  /** i18n key（locales/<lang>/domain-group.json） */
  labelKey: string;
  /** lucide 图标名（lib/iconMapping.tsx 白名单内） */
  icon: string;
  order: number;
  /** 组内业务域 code，与 modules/<domain>/config.ts 顶层 code 一致 */
  domains: readonly string[];
}

/**
 * 10 个一级域组。顺序即侧边栏顺序：业务主线在前，平台与分析在后。
 *
 * 归属说明：
 *  - crm 归 supplychain（销售/客户是商贸链一端）；
 *  - master/automation 归 platform（主数据与自动化任务属平台能力）；
 *  - oa/im 归 collab（与 pm/doc/workflow 同属协同）；
 *  - mobile 归 collab（Web 侧侧栏隐藏，移动端独立渲染，但配置共用）。
 */
export const DOMAIN_GROUPS: readonly DomainGroupDef[] = [
  {
    code: 'manufacturing',
    labelKey: 'domain-group.nav.manufacturing',
    icon: 'Factory',
    order: 0,
    domains: ['mes', 'wms', 'aps'],
  },
  {
    code: 'supplychain',
    labelKey: 'domain-group.nav.supplychain',
    icon: 'Truck',
    order: 1,
    domains: ['scm', 'srm', 'tms', 'crm'],
  },
  {
    code: 'finance',
    labelKey: 'domain-group.nav.finance',
    icon: 'Wallet',
    order: 2,
    domains: ['finance', 'erp'],
  },
  { code: 'hr', labelKey: 'domain-group.nav.hr', icon: 'Users', order: 3, domains: ['hrm'] },
  {
    code: 'rd',
    labelKey: 'domain-group.nav.rd',
    icon: 'FlaskConical',
    order: 4,
    domains: ['rd', 'pdm'],
  },
  {
    code: 'quality',
    labelKey: 'domain-group.nav.quality',
    icon: 'ShieldCheck',
    order: 5,
    domains: ['qms', 'lims'],
  },
  {
    code: 'asset',
    labelKey: 'domain-group.nav.asset',
    icon: 'Wrench',
    order: 6,
    domains: ['asset', 'ehs'],
  },
  {
    code: 'platform',
    labelKey: 'domain-group.nav.platform',
    icon: 'Settings',
    order: 7,
    domains: ['admin', 'iam', 'integration', 'plugin', 'master', 'automation'],
  },
  {
    code: 'analytics',
    labelKey: 'domain-group.nav.analytics',
    icon: 'BarChart3',
    order: 8,
    domains: ['bi', 'report', 'gis', 'ai'],
  },
  {
    code: 'collab',
    labelKey: 'domain-group.nav.collab',
    icon: 'MessageSquare',
    order: 9,
    domains: ['pm', 'workflow', 'doc', 'ticket', 'notification', 'monitor', 'mobile', 'oa', 'im'],
  },
];

/** 域 code → 组 code（由 DOMAIN_GROUPS 派生，勿手工维护） */
export const DOMAIN_GROUP_MAP: Readonly<Record<string, DomainGroupCode>> = Object.freeze(
  DOMAIN_GROUPS.reduce<Record<string, DomainGroupCode>>((acc, group) => {
    for (const domain of group.domains) {
      acc[domain] = group.code;
    }
    return acc;
  }, {})
);

/** 组 code → 组定义，渲染层按组聚合时使用 */
export const DOMAIN_GROUP_BY_CODE: Readonly<Record<string, DomainGroupDef>> = Object.freeze(
  DOMAIN_GROUPS.reduce<Record<string, DomainGroupDef>>((acc, group) => {
    acc[group.code] = group;
    return acc;
  }, {})
);
