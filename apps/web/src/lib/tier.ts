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
    name: '身份认证与权限',
    description: '用户、角色、权限、认证',
    minTier: PlanTier.Free,
    features: ['用户管理', '角色管理', '权限控制', '登录认证'],
  },
  {
    module: 'tenant',
    name: '租户管理',
    description: '多租户隔离与管理',
    minTier: PlanTier.Free,
    features: ['租户创建', '租户配置', '数据隔离'],
  },
  {
    module: 'master-data',
    name: '基础数据',
    description: '物料、客户、供应商等基础数据',
    minTier: PlanTier.Free,
    features: ['物料管理', '客户管理', '供应商管理'],
  },
  {
    module: 'ticket',
    name: '工单管理',
    description: '工单创建、分配、跟踪',
    minTier: PlanTier.Free,
    features: ['工单创建', '工单分配', '工单跟踪'],
  },
  {
    module: 'communication',
    name: '通讯中心',
    description: '消息、通知、实时通讯',
    minTier: PlanTier.Free,
    features: ['消息通知', '站内信'],
  },

  // === Basic 层（核心业务）===
  {
    module: 'mes',
    name: '制造执行系统',
    description: '生产订单、工单、报工、质量',
    minTier: PlanTier.Basic,
    features: ['生产订单', '工单管理', '生产报工', '质量检验', '设备管理'],
  },
  {
    module: 'wms',
    name: '仓储管理系统',
    description: '入库、出库、库存、盘点',
    minTier: PlanTier.Basic,
    features: ['入库管理', '出库管理', '库存管理', '盘点管理'],
  },
  {
    module: 'qms',
    name: '质量管理系统',
    description: '质量标准、检验、不合格品',
    minTier: PlanTier.Basic,
    features: ['质量标准', '质量检验', '不合格品', '质量追溯'],
  },
  {
    module: 'scm',
    name: '供应链管理',
    description: '采购、需求、计划',
    minTier: PlanTier.Basic,
    features: ['采购管理', '需求计划', '供应链协同'],
  },
  {
    module: 'srm',
    name: '供应商关系管理',
    description: '供应商评估、绩效、协同',
    minTier: PlanTier.Basic,
    features: ['供应商档案', '供应商评估', '供应商绩效'],
  },
  {
    module: 'crm',
    name: '客户关系管理',
    description: '客户、商机、合同',
    minTier: PlanTier.Basic,
    features: ['客户管理', '商机管理', '合同管理'],
  },
  {
    module: 'finance',
    name: '财务管理',
    description: '应收、应付、总账、报表',
    minTier: PlanTier.Basic,
    features: ['应收管理', '应付管理', '财务报表'],
  },
  {
    module: 'hrm',
    name: '人力资源管理',
    description: '员工、组织、考勤、薪酬',
    minTier: PlanTier.Basic,
    features: ['员工管理', '组织管理', '考勤管理'],
  },
  {
    module: 'analytics',
    name: '数据分析（基础）',
    description: '报表、仪表盘、基础分析',
    minTier: PlanTier.Basic,
    features: ['报表管理', '仪表盘', '基础数据分析'],
  },
  {
    module: 'erp',
    name: '企业资源计划',
    description: 'ERP 核心模块',
    minTier: PlanTier.Basic,
    features: ['ERP 核心'],
  },
  {
    module: 'ehs',
    name: '环境健康安全',
    description: 'EHS 管理',
    minTier: PlanTier.Basic,
    features: ['EHS 基础'],
  },

  // === Advanced 层（全功能）===
  {
    module: 'ai',
    name: 'AI 智能',
    description: 'AI Copilot、智能分析、预测',
    minTier: PlanTier.Advanced,
    features: ['AI Copilot', '智能分析', '预测模型', 'MCP 工具'],
  },
  {
    module: 'lims',
    name: '实验室管理',
    description: '样品、检验、仪器、校准',
    minTier: PlanTier.Advanced,
    features: ['样品管理', '检验管理', '仪器管理', '校准管理'],
  },
  {
    module: 'pdm',
    name: '产品数据管理',
    description: 'BOM、工艺、文档',
    minTier: PlanTier.Advanced,
    features: ['BOM 管理', '工艺管理', '文档管理'],
  },
  {
    module: 'rd',
    name: '研发管理',
    description: '项目、任务、成果',
    minTier: PlanTier.Advanced,
    features: ['研发项目', '研发任务'],
  },
  {
    module: 'pm',
    name: '项目管理',
    description: '项目、任务、甘特图',
    minTier: PlanTier.Advanced,
    features: ['项目管理', '任务管理', '甘特图'],
  },
  {
    module: 'tms',
    name: '运输管理',
    description: '运输、配送、轨迹',
    minTier: PlanTier.Advanced,
    features: ['运输管理', '配送管理'],
  },
  {
    module: 'gis',
    name: '地理信息',
    description: '地图、位置、空间分析',
    minTier: PlanTier.Advanced,
    features: ['地图服务', '位置管理'],
  },
  {
    module: 'monitor',
    name: '监控中心',
    description: '系统监控、告警、性能',
    minTier: PlanTier.Advanced,
    features: ['系统监控', '告警管理'],
  },
  {
    module: 'integration',
    name: '系统集成',
    description: 'API、ESB、数据同步',
    minTier: PlanTier.Advanced,
    features: ['API 管理', '数据同步'],
  },
  {
    module: 'search',
    name: '企业搜索',
    description: '全文搜索、语义搜索',
    minTier: PlanTier.Advanced,
    features: ['全文搜索', '语义搜索'],
  },
];

/** 模块标识 → 功能定义 映射 */
const MODULE_MAP: Map<string, ModuleFeature> = new Map(
  TIER_FEATURE_MATRIX.map((m) => [m.module, m]),
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
  getModule?: (item: T) => string,
): T[] {
  return modules.filter((item) => {
    const module = getModule
      ? getModule(item)
      : item.module ?? item.path?.match(/^\/([^/]+)/)?.[1] ?? '';
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
