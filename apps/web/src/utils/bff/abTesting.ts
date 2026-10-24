/**
 * V45.0 Track D: A/B 测试引擎
 *
 * 功能:
 * - 实验管理：创建/启动/暂停/完成实验
 * - 流量分配：基于用户 ID 的 FNV-1a 哈希 + 变体权重分配
 * - 目标定向：通过 TargetingRule 精确圈定实验人群
 * - 转化追踪：记录参与者与转化事件
 * - 结果分析：转化率 + Z-test 显著性检验，自动判定赢家
 *
 * 所有数据用内存存储 + localStorage 持久化。
 */

// ==================== 枚举与类型 ====================

/** 实验状态 */
export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

/** 目标定向操作符 */
export type TargetingOperator =
  'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains';

/** 目标定向规则 */
export interface TargetingRule {
  /** 用户属性字段（如 'role' | 'tenant_id' | 'plan'） */
  field: string;
  /** 比较操作符 */
  operator: TargetingOperator;
  /** 比较值 */
  value: unknown;
}

/** 实验变体 */
export interface Variant {
  /** 变体 ID（唯一） */
  id: string;
  /** 变体名称 */
  name: string;
  /** 流量权重（相对值，所有变体权重之和决定分配比例） */
  weight: number;
  /** 是否为对照组 */
  is_control: boolean;
  /** 变体配置（业务可读取此配置切换行为） */
  config: Record<string, unknown>;
}

/** 实验指标定义 */
export interface ExperimentMetric {
  /** 指标名 */
  name: string;
  /** 指标描述 */
  description?: string;
  /** 是否为主指标（用于判定赢家） */
  primary?: boolean;
}

/** 实验定义 */
export interface Experiment {
  /** 实验 ID（唯一） */
  id: string;
  /** 实验名称 */
  name: string;
  /** 实验描述 */
  description: string;
  /** 实验状态 */
  status: ExperimentStatus;
  /** 变体列表 */
  variants: Variant[];
  /** 流量分配比例（0-1，表示参与实验的用户占比） */
  traffic_allocation: number;
  /** 目标定向规则（AND 关系，全部满足才入组） */
  targeting: TargetingRule[];
  /** 跟踪指标 */
  metrics: ExperimentMetric[];
  /** 开始时间（ISO） */
  start_date: string | null;
  /** 结束时间（ISO） */
  end_date: string | null;
  /** 创建时间（ISO） */
  created_at: string;
  /** 更新时间（ISO） */
  updated_at: string;
}

/** 单个变体的实验结果 */
export interface VariantResult {
  /** 变体 ID */
  variant_id: string;
  /** 变体名称 */
  variant_name: string;
  /** 是否为对照组 */
  is_control: boolean;
  /** 参与者数量 */
  participants: number;
  /** 转化数量 */
  conversions: number;
  /** 转化率（0-1） */
  conversion_rate: number;
  /** 自定义指标聚合（指标名 → 数值） */
  metrics: Record<string, number>;
}

/** 实验结果 */
export interface ExperimentResult {
  /** 实验 ID */
  experiment_id: string;
  /** 各变体结果 */
  variant_results: VariantResult[];
  /** 置信度（0-1，Z-test 置信水平） */
  confidence: number;
  /** 是否统计显著（置信度 >= 0.95） */
  significance: boolean;
  /** 赢家变体 ID（未达显著或实验未结束则为 null） */
  winner: string | null;
  /** Z-score */
  z_score: number;
  /** P-value */
  p_value: number;
  /** 生成时间 */
  computed_at: string;
}

/** 用户分配记录 */
export interface AssignmentRecord {
  experiment_id: string;
  user_id: string;
  variant_id: string;
  assigned_at: string;
}

/** 转化事件记录 */
export interface ConversionEvent {
  experiment_id: string;
  user_id: string;
  variant_id: string;
  metric_name: string;
  value: number;
  timestamp: string;
}

// ==================== FNV-1a 哈希 ====================

/**
 * FNV-1a 32 位哈希
 *
 * 用于将用户 ID + 实验 ID 映射到稳定的哈希值，
 * 保证同一用户在同一实验中始终分配到同一变体。
 */
export function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis (32-bit)
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime (32-bit): 16777619
    hash = Math.imul(hash, 0x01000193);
  }
  // 转为无符号 32 位整数
  return hash >>> 0;
}

// ==================== 统计检验 ====================

/**
 * 标准正态分布的累积分布函数（CDF）近似
 *
 * 使用 Abramowitz & Stegun 近似公式，精度约 7.5e-8。
 */

/**
 * 双尾 Z-test P-value
 */

/**
 * 两比例 Z 检验
 *
 * 比较对照组与实验组的转化率差异是否显著。
 *
 * @param cr1 对照组转化率
 * @param n1 对照组样本量
 * @param cr2 实验组转化率
 * @param n2 实验组样本量
 * @returns { zScore, pValue }
 */

// ==================== A/B 测试引擎 ====================

/**
 * A/B 测试引擎
 *
 * 单例模式，全局管理实验配置、用户分配与转化追踪。
 */

// ==================== 单例 ====================

/** A/B 测试引擎单例 */
