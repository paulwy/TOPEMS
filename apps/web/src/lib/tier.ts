/**
 * 订阅层级（Plan Tier）工具函数
 *
 * 与后端 `svc/unified-core/src/modules/subscription/mod.rs` 的三层功能清单矩阵保持一致。
 * 用于前端模块可用性判断、菜单过滤、路由守卫。
 *
 * 三层定义：
 * - free: 基础功能（5 模块）
 * - basic: 核心业务功能（free + 13 模块）
 * - advanced: 全功能（basic + 10 模块）
 */

import i18n from '@/i18n';

/** 订阅层级 */
export enum PlanTier {
  Free = 'free',
  Basic = 'basic',
  Advanced = 'advanced',
}

/** 层级排序值（用于比较） */
export const TIER_LEVEL: Record<PlanTier, number> = {
  [PlanTier.Free]: 0,
  [PlanTier.Basic]: 1,
  [PlanTier.Advanced]: 2,
};

/** 模块功能定义 */
export interface ModuleFeature {
  /** 模块标识（如 "mes", "wms"） */
  module: string;
  /** 模块名称 */
  name: string;
  /** 模块描述 */
  description?: string;
  /** 最低可用层级 */
  minTier: PlanTier;
  /** 功能点列表 */
  features: string[];
}

/**
 * 三层功能清单矩阵
 *
 * 与后端 TierFeatureMatrix::all_modules() 保持一致。
 * 修改时请同步更新后端。
 */
export const TIER_FEATURE_MATRIX: ModuleFeature[] = [
  // === Free 层（基础功能）===
  {
    module: 'iam',
    name: i18n.t('components.tier.free.iam.name'),
    description: i18n.t('components.tier.free.iam.description'),
    minTier: PlanTier.Free,
    features: [
      i18n.t('components.tier.free.iam.features.0'),
      i18n.t('components.tier.free.iam.features.1'),
      i18n.t('components.tier.free.iam.features.2'),
      i18n.t('components.tier.free.iam.features.3'),
    ],
  },
  {
    module: 'tenant',
    name: i18n.t('components.tier.free.tenant.name'),
    description: i18n.t('components.tier.free.tenant.description'),
    minTier: PlanTier.Free,
    features: [
      i18n.t('components.tier.free.tenant.features.0'),
      i18n.t('components.tier.free.tenant.features.1'),
      i18n.t('components.tier.free.tenant.features.2'),
    ],
  },
  {
    module: 'master-data',
    name: i18n.t('components.tier.free.master-data.name'),
    description: i18n.t('components.tier.free.master-data.description'),
    minTier: PlanTier.Free,
    features: [
      i18n.t('components.tier.free.master-data.features.0'),
      i18n.t('components.tier.free.master-data.features.1'),
      i18n.t('components.tier.free.master-data.features.2'),
    ],
  },
  {
    module: 'ticket',
    name: i18n.t('components.tier.free.ticket.name'),
    description: i18n.t('components.tier.free.ticket.description'),
    minTier: PlanTier.Free,
    features: [
      i18n.t('components.tier.free.ticket.features.0'),
      i18n.t('components.tier.free.ticket.features.1'),
      i18n.t('components.tier.free.ticket.features.2'),
    ],
  },
  {
    module: 'communication',
    name: i18n.t('components.tier.free.communication.name'),
    description: i18n.t('components.tier.free.communication.description'),
    minTier: PlanTier.Free,
    features: [
      i18n.t('components.tier.free.communication.features.0'),
      i18n.t('components.tier.free.communication.features.1'),
    ],
  },

  // === Basic 层（核心业务）===
  {
    module: 'mes',
    name: i18n.t('components.tier.basic.mes.name'),
    description: i18n.t('components.tier.basic.mes.description'),
    minTier: PlanTier.Basic,
    features: [
      i18n.t('components.tier.basic.mes.features.0'),
      i18n.t('components.tier.basic.mes.features.1'),
      i18n.t('components.tier.basic.mes.features.2'),
      i18n.t('components.tier.basic.mes.features.3'),
      i18n.t('components.tier.basic.mes.features.4'),
    ],
  },
  {
    module: 'wms',
    name: i18n.t('components.tier.basic.wms.name'),
    description: i18n.t('components.tier.basic.wms.description'),
    minTier: PlanTier.Basic,
    features: [
      i18n.t('components.tier.basic.wms.features.0'),
      i18n.t('components.tier.basic.wms.features.1'),
      i18n.t('components.tier.basic.wms.features.2'),
      i18n.t('components.tier.basic.wms.features.3'),
    ],
  },
  {
    module: 'qms',
    name: i18n.t('components.tier.basic.qms.name'),
    description: i18n.t('components.tier.basic.qms.description'),
    minTier: PlanTier.Basic,
    features: [
      i18n.t('components.tier.basic.qms.features.0'),
      i18n.t('components.tier.basic.qms.features.1'),
      i18n.t('components.tier.basic.qms.features.2'),
      i18n.t('components.tier.basic.qms.features.3'),
    ],
  },
  {
    module: 'scm',
    name: i18n.t('components.tier.basic.scm.name'),
    description: i18n.t('components.tier.basic.scm.description'),
    minTier: PlanTier.Basic,
    features: [
      i18n.t('components.tier.basic.scm.features.0'),
      i18n.t('components.tier.basic.scm.features.1'),
      i18n.t('components.tier.basic.scm.features.2'),
    ],
  },
  {
    module: 'srm',
    name: i18n.t('components.tier.basic.srm.name'),
    description: i18n.t('components.tier.basic.srm.description'),
    minTier: PlanTier.Basic,
    features: [
      i18n.t('components.tier.basic.srm.features.0'),
      i18n.t('components.tier.basic.srm.features.1'),
      i18n.t('components.tier.basic.srm.features.2'),
    ],
  },
  {
    module: 'crm',
    name: i18n.t('components.tier.basic.crm.name'),
    description: i18n.t('components.tier.basic.crm.description'),
    minTier: PlanTier.Basic,
    features: [
      i18n.t('components.tier.basic.crm.features.0'),
      i18n.t('components.tier.basic.crm.features.1'),
      i18n.t('components.tier.basic.crm.features.2'),
    ],
  },
  {
    module: 'finance',
    name: i18n.t('components.tier.basic.finance.name'),
    description: i18n.t('components.tier.basic.finance.description'),
    minTier: PlanTier.Basic,
    features: [
      i18n.t('components.tier.basic.finance.features.0'),
      i18n.t('components.tier.basic.finance.features.1'),
      i18n.t('components.tier.basic.finance.features.2'),
    ],
  },
  {
    module: 'hrm',
    name: i18n.t('components.tier.basic.hrm.name'),
    description: i18n.t('components.tier.basic.hrm.description'),
    minTier: PlanTier.Basic,
    features: [
      i18n.t('components.tier.basic.hrm.features.0'),
      i18n.t('components.tier.basic.hrm.features.1'),
      i18n.t('components.tier.basic.hrm.features.2'),
    ],
  },
  {
    module: 'analytics',
    name: i18n.t('components.tier.basic.analytics.name'),
    description: i18n.t('components.tier.basic.analytics.description'),
    minTier: PlanTier.Basic,
    features: [
      i18n.t('components.tier.basic.analytics.features.0'),
      i18n.t('components.tier.basic.analytics.features.1'),
      i18n.t('components.tier.basic.analytics.features.2'),
    ],
  },
  {
    module: 'erp',
    name: i18n.t('components.tier.basic.erp.name'),
    description: i18n.t('components.tier.basic.erp.description'),
    minTier: PlanTier.Basic,
    features: [i18n.t('components.tier.basic.erp.features.0')],
  },
  {
    module: 'ehs',
    name: i18n.t('components.tier.basic.ehs.name'),
    description: i18n.t('components.tier.basic.ehs.description'),
    minTier: PlanTier.Basic,
    features: [i18n.t('components.tier.basic.ehs.features.0')],
  },

  // === Advanced 层（全功能）===
  {
    module: 'ai',
    name: i18n.t('components.tier.advanced.ai.name'),
    description: i18n.t('components.tier.advanced.ai.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.ai.features.0'),
      i18n.t('components.tier.advanced.ai.features.1'),
      i18n.t('components.tier.advanced.ai.features.2'),
      i18n.t('components.tier.advanced.ai.features.3'),
    ],
  },
  {
    module: 'lims',
    name: i18n.t('components.tier.advanced.lims.name'),
    description: i18n.t('components.tier.advanced.lims.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.lims.features.0'),
      i18n.t('components.tier.advanced.lims.features.1'),
      i18n.t('components.tier.advanced.lims.features.2'),
      i18n.t('components.tier.advanced.lims.features.3'),
    ],
  },
  {
    module: 'pdm',
    name: i18n.t('components.tier.advanced.pdm.name'),
    description: i18n.t('components.tier.advanced.pdm.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.pdm.features.0'),
      i18n.t('components.tier.advanced.pdm.features.1'),
      i18n.t('components.tier.advanced.pdm.features.2'),
    ],
  },
  {
    module: 'rd',
    name: i18n.t('components.tier.advanced.rd.name'),
    description: i18n.t('components.tier.advanced.rd.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.rd.features.0'),
      i18n.t('components.tier.advanced.rd.features.1'),
    ],
  },
  {
    module: 'pm',
    name: i18n.t('components.tier.advanced.pm.name'),
    description: i18n.t('components.tier.advanced.pm.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.pm.features.0'),
      i18n.t('components.tier.advanced.pm.features.1'),
      i18n.t('components.tier.advanced.pm.features.2'),
    ],
  },
  {
    module: 'tms',
    name: i18n.t('components.tier.advanced.tms.name'),
    description: i18n.t('components.tier.advanced.tms.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.tms.features.0'),
      i18n.t('components.tier.advanced.tms.features.1'),
    ],
  },
  {
    module: 'gis',
    name: i18n.t('components.tier.advanced.gis.name'),
    description: i18n.t('components.tier.advanced.gis.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.gis.features.0'),
      i18n.t('components.tier.advanced.gis.features.1'),
    ],
  },
  {
    module: 'monitor',
    name: i18n.t('components.tier.advanced.monitor.name'),
    description: i18n.t('components.tier.advanced.monitor.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.monitor.features.0'),
      i18n.t('components.tier.advanced.monitor.features.1'),
    ],
  },
  {
    module: 'integration',
    name: i18n.t('components.tier.advanced.integration.name'),
    description: i18n.t('components.tier.advanced.integration.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.integration.features.0'),
      i18n.t('components.tier.advanced.integration.features.1'),
    ],
  },
  {
    module: 'search',
    name: i18n.t('components.tier.advanced.search.name'),
    description: i18n.t('components.tier.advanced.search.description'),
    minTier: PlanTier.Advanced,
    features: [
      i18n.t('components.tier.advanced.search.features.0'),
      i18n.t('components.tier.advanced.search.features.1'),
    ],
  },
];

/** 模块标识 → 功能定义 映射 */
const MODULE_MAP: Map<string, ModuleFeature> = new Map(
  TIER_FEATURE_MATRIX.map((m) => [m.module, m])
);

/**
 * 从字符串解析层级
 */
export function parsePlanTier(s: string | null | undefined): PlanTier {
  if (!s) return PlanTier.Basic;
  switch (s.toLowerCase()) {
    case 'free':
      return PlanTier.Free;
    case 'basic':
      return PlanTier.Basic;
    case 'advanced':
      return PlanTier.Advanced;
    default:
      return PlanTier.Basic;
  }
}

/**
 * 当前层级是否包含目标层级（当前层级 >= 目标层级）
 */
export function tierIncludes(current: PlanTier, target: PlanTier): boolean {
  return TIER_LEVEL[current] >= TIER_LEVEL[target];
}

/**
 * 获取指定层级可用的模块
 */
export function getModulesForTier(tier: PlanTier): ModuleFeature[] {
  return TIER_FEATURE_MATRIX.filter((m) => tierIncludes(tier, m.minTier));
}

/**
 * 获取指定层级不可用的模块
 */
export function getModulesNotForTier(tier: PlanTier): ModuleFeature[] {
  return TIER_FEATURE_MATRIX.filter((m) => !tierIncludes(tier, m.minTier));
}

/**
 * 检查模块是否对指定层级可用
 */
export function isModuleAvailable(module: string, tier: PlanTier): boolean {
  const feature = MODULE_MAP.get(module);
  if (!feature) {
    // 未在矩阵中的模块默认可用（避免误伤）
    return true;
  }
  return tierIncludes(tier, feature.minTier);
}

/**
 * 检查路径是否属于可用模块
 *
 * 路径格式：/{module}/...
 */
export function isPathAvailable(path: string, tier: PlanTier): boolean {
  // 提取路径中的模块名（第一段）
  const match = path.match(/^\/([^/]+)/);
  if (!match) return true;

  const module = match[1];
  // 特殊路径不进行 tier 检查
  const bypassModules = ['login', 'dashboard', 'admin', 'settings', 'profile', '403', '404'];
  if (bypassModules.includes(module)) return true;

  return isModuleAvailable(module, tier);
}

/**
 * 过滤模块列表，只保留对指定层级可用的模块
 */
export function filterModulesByTier<T extends { module?: string; path?: string }>(
  modules: T[],
  tier: PlanTier,
  getModule?: (item: T) => string
): T[] {
  return modules.filter((item) => {
    const module = getModule
      ? getModule(item)
      : (item.module ?? item.path?.match(/^\/([^/]+)/)?.[1] ?? '');
    return isModuleAvailable(module, tier);
  });
}

/**
 * 获取层级统计
 */
export function getTierStats(): Record<PlanTier, number> {
  const stats: Record<PlanTier, number> = {
    [PlanTier.Free]: 0,
    [PlanTier.Basic]: 0,
    [PlanTier.Advanced]: 0,
  };
  for (const m of TIER_FEATURE_MATRIX) {
    stats[m.minTier]++;
  }
  return stats;
}

/**
 * 获取模块的最低层级要求
 */
export function getModuleMinTier(module: string): PlanTier | null {
  return MODULE_MAP.get(module)?.minTier ?? null;
}
