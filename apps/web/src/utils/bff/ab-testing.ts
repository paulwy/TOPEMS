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

import { logger } from '@/utils/logger';

const abLogger = logger.child({ prefix: 'BFF-ABTest' });

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
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * 双尾 Z-test P-value
 */
function zTestPValue(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

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
export function twoProportionZTest(
  cr1: number,
  n1: number,
  cr2: number,
  n2: number
): { zScore: number; pValue: number } {
  // 样本量不足时无法判定显著性
  if (n1 === 0 || n2 === 0) return { zScore: 0, pValue: 1 };
  const p1 = cr1;
  const p2 = cr2;
  const pooled = (p1 * n1 + p2 * n2) / (n1 + n2);
  // 池化比例为 0 或 1 时方差为 0，无法计算
  if (pooled === 0 || pooled === 1) return { zScore: 0, pValue: 1 };
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (se === 0) return { zScore: 0, pValue: 1 };
  const zScore = (p2 - p1) / se;
  const pValue = zTestPValue(zScore);
  return { zScore, pValue };
}

// ==================== A/B 测试引擎 ====================

const STORAGE_KEY = 'topems:bff:ab-test';
const MAX_EVENTS = 5000;

/**
 * A/B 测试引擎
 *
 * 单例模式，全局管理实验配置、用户分配与转化追踪。
 */
export class ABTestEngine {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, AssignmentRecord> = new Map();
  private conversions: ConversionEvent[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  // ==================== 实验管理 ====================

  /**
   * 创建实验
   * @returns 创建的实验
   */
  createExperiment(input: {
    id?: string;
    name: string;
    description: string;
    variants: Array<Omit<Variant, 'id'> & { id?: string }>;
    traffic_allocation?: number;
    targeting?: TargetingRule[];
    metrics?: ExperimentMetric[];
  }): Experiment {
    const now = new Date().toISOString();
    const id = input.id ?? `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (this.experiments.has(id)) {
      throw new Error(`实验已存在: ${id}`);
    }

    // 校验变体：至少 2 个，且恰好 1 个对照组
    if (input.variants.length < 2) {
      throw new Error('实验至少需要 2 个变体');
    }
    const controlCount = input.variants.filter((v) => v.is_control).length;
    if (controlCount !== 1) {
      throw new Error('实验必须且只能有 1 个对照组');
    }
    // 校验权重
    if (input.variants.some((v) => v.weight <= 0)) {
      throw new Error('变体权重必须为正数');
    }

    const variants: Variant[] = input.variants.map((v, idx) => ({
      id: v.id ?? `${id}-variant-${idx}`,
      name: v.name,
      weight: v.weight,
      is_control: v.is_control,
      config: v.config ?? {},
    }));

    const experiment: Experiment = {
      id,
      name: input.name,
      description: input.description,
      status: ExperimentStatus.DRAFT,
      variants,
      traffic_allocation: Math.min(1, Math.max(0, input.traffic_allocation ?? 1)),
      targeting: input.targeting ?? [],
      metrics: input.metrics ?? [],
      start_date: null,
      end_date: null,
      created_at: now,
      updated_at: now,
    };

    this.experiments.set(id, experiment);
    this.persist();
    this.notifyListeners();
    abLogger.info(`创建实验: ${id} (${experiment.name})`);
    return experiment;
  }

  /** 启动实验 */
  startExperiment(experimentId: string): Experiment {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`实验不存在: ${experimentId}`);
    if (exp.status === ExperimentStatus.RUNNING) {
      throw new Error('实验已在运行中');
    }
    exp.status = ExperimentStatus.RUNNING;
    exp.start_date = exp.start_date ?? new Date().toISOString();
    exp.updated_at = new Date().toISOString();
    this.experiments.set(experimentId, exp);
    this.persist();
    this.notifyListeners();
    abLogger.info(`启动实验: ${experimentId}`);
    return exp;
  }

  /** 暂停实验 */
  pauseExperiment(experimentId: string): Experiment {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`实验不存在: ${experimentId}`);
    if (exp.status !== ExperimentStatus.RUNNING) {
      throw new Error('只能暂停运行中的实验');
    }
    exp.status = ExperimentStatus.PAUSED;
    exp.updated_at = new Date().toISOString();
    this.experiments.set(experimentId, exp);
    this.persist();
    this.notifyListeners();
    abLogger.info(`暂停实验: ${experimentId}`);
    return exp;
  }

  /** 完成实验 */
  completeExperiment(experimentId: string): Experiment {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`实验不存在: ${experimentId}`);
    exp.status = ExperimentStatus.COMPLETED;
    exp.end_date = new Date().toISOString();
    exp.updated_at = new Date().toISOString();
    this.experiments.set(experimentId, exp);
    this.persist();
    this.notifyListeners();
    abLogger.info(`完成实验: ${experimentId}`);
    return exp;
  }

  /** 列出所有实验 */
  listExperiments(status?: ExperimentStatus): Experiment[] {
    const all = Array.from(this.experiments.values());
    if (status) return all.filter((e) => e.status === status);
    return all;
  }

  /** 获取单个实验 */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  /** 删除实验 */
  deleteExperiment(experimentId: string): boolean {
    const deleted = this.experiments.delete(experimentId);
    if (deleted) {
      // 清理相关分配与转化记录
      for (const [key, rec] of this.assignments) {
        if (rec.experiment_id === experimentId) {
          this.assignments.delete(key);
        }
      }
      this.conversions = this.conversions.filter((c) => c.experiment_id !== experimentId);
      this.persist();
      this.notifyListeners();
    }
    return deleted;
  }

  // ==================== 流量分配 ====================

  /**
   * 为用户分配变体
   *
   * 流程：
   * 1. 检查实验状态（必须 Running）
   * 2. 评估目标定向规则
   * 3. 基于 FNV-1a 哈希（userId + experimentId）计算流量分配
   * 4. 按变体权重分配
   *
   * 同一用户在同一实验中始终获得同一变体（幂等）。
   *
   * @returns 分配的变体，未入组返回 null
   */
  assignVariant(
    experimentId: string,
    userId: string,
    userAttributes?: Record<string, unknown>
  ): Variant | null {
    const exp = this.experiments.get(experimentId);
    if (!exp) return null;
    if (exp.status !== ExperimentStatus.RUNNING) return null;

    // 目标定向
    if (!this.matchesTargeting(exp.targeting, userAttributes)) {
      return null;
    }

    // 幂等：已分配过则直接返回
    const assignKey = `${experimentId}:${userId}`;
    const existing = this.assignments.get(assignKey);
    if (existing) {
      return exp.variants.find((v) => v.id === existing.variant_id) ?? null;
    }

    // 流量分配：哈希值 / 2^32 与 traffic_allocation 比较
    const hash = fnv1aHash(`${userId}:${experimentId}`);
    const bucket = hash / 0x100000000; // 归一化到 [0, 1)
    if (bucket >= exp.traffic_allocation) {
      return null; // 未命中实验流量
    }

    // 按权重分配变体
    const totalWeight = exp.variants.reduce((sum, v) => sum + v.weight, 0);
    let cumulative = 0;
    const normalized = bucket / exp.traffic_allocation; // 在实验流量内归一化
    let assigned: Variant | null = null;
    for (const variant of exp.variants) {
      cumulative += variant.weight / totalWeight;
      if (normalized <= cumulative) {
        assigned = variant;
        break;
      }
    }
    // 兜底：浮点精度问题，分配到最后一个变体
    if (!assigned) {
      assigned = exp.variants[exp.variants.length - 1] ?? null;
    }
    if (!assigned) return null;

    // 记录分配
    this.assignments.set(assignKey, {
      experiment_id: experimentId,
      user_id: userId,
      variant_id: assigned.id,
      assigned_at: new Date().toISOString(),
    });
    this.persist();
    this.notifyListeners();
    return assigned;
  }

  /** 获取用户当前分配（不触发新分配） */
  getAssignment(experimentId: string, userId: string): Variant | null {
    const exp = this.experiments.get(experimentId);
    if (!exp) return null;
    const existing = this.assignments.get(`${experimentId}:${userId}`);
    if (!existing) return null;
    return exp.variants.find((v) => v.id === existing.variant_id) ?? null;
  }

  // ==================== 转化追踪 ====================

  /**
   * 记录转化事件
   *
   * @param experimentId 实验 ID
   * @param userId 用户 ID
   * @param metricName 指标名（默认 'conversion'）
   * @param value 转化值（默认 1）
   */
  trackConversion(
    experimentId: string,
    userId: string,
    metricName = 'conversion',
    value = 1
  ): void {
    const exp = this.experiments.get(experimentId);
    if (!exp) {
      abLogger.warn(`转化追踪失败：实验不存在 ${experimentId}`);
      return;
    }
    const assignment = this.assignments.get(`${experimentId}:${userId}`);
    if (!assignment) {
      abLogger.debug(`转化追踪跳过：用户 ${userId} 未分配到实验 ${experimentId}`);
      return;
    }

    this.conversions.unshift({
      experiment_id: experimentId,
      user_id: userId,
      variant_id: assignment.variant_id,
      metric_name: metricName,
      value,
      timestamp: new Date().toISOString(),
    });
    if (this.conversions.length > MAX_EVENTS) {
      this.conversions.length = MAX_EVENTS;
    }
    this.persist();
    this.notifyListeners();
  }

  // ==================== 结果分析 ====================

  /**
   * 计算实验结果
   *
   * - 统计各变体参与者数与转化数
   * - 计算转化率
   * - 对每个非对照组与对照组做 Z-test，取最显著的对比
   * - 置信度 >= 0.95 视为显著，转化率最高的变体为赢家
   */
  getResult(experimentId: string): ExperimentResult {
    const exp = this.experiments.get(experimentId);
    const now = new Date().toISOString();

    if (!exp) {
      return {
        experiment_id: experimentId,
        variant_results: [],
        confidence: 0,
        significance: false,
        winner: null,
        z_score: 0,
        p_value: 1,
        computed_at: now,
      };
    }

    // 统计每个变体的参与者
    const participantsByVariant = new Map<string, number>();
    for (const v of exp.variants) {
      participantsByVariant.set(v.id, 0);
    }
    for (const rec of this.assignments.values()) {
      if (rec.experiment_id === experimentId) {
        participantsByVariant.set(
          rec.variant_id,
          (participantsByVariant.get(rec.variant_id) ?? 0) + 1
        );
      }
    }

    // 统计每个变体的转化（按 metric_name 聚合）
    const conversionsByVariant = new Map<string, number>();
    const metricsByVariant = new Map<string, Record<string, number>>();
    for (const v of exp.variants) {
      conversionsByVariant.set(v.id, 0);
      metricsByVariant.set(v.id, {});
    }
    // 仅统计默认 'conversion' 指标为转化数
    const uniqueConverters = new Map<string, Set<string>>();
    for (const v of exp.variants) {
      uniqueConverters.set(v.id, new Set());
    }
    for (const c of this.conversions) {
      if (c.experiment_id !== experimentId) continue;
      if (c.metric_name === 'conversion') {
        uniqueConverters.get(c.variant_id)?.add(c.user_id);
      }
      const m = metricsByVariant.get(c.variant_id);
      if (m) {
        m[c.metric_name] = (m[c.metric_name] ?? 0) + c.value;
      }
    }
    for (const v of exp.variants) {
      conversionsByVariant.set(v.id, uniqueConverters.get(v.id)?.size ?? 0);
    }

    // 构造变体结果
    const variantResults: VariantResult[] = exp.variants.map((v) => {
      const participants = participantsByVariant.get(v.id) ?? 0;
      const conversions = conversionsByVariant.get(v.id) ?? 0;
      return {
        variant_id: v.id,
        variant_name: v.name,
        is_control: v.is_control,
        participants,
        conversions,
        conversion_rate: participants > 0 ? conversions / participants : 0,
        metrics: metricsByVariant.get(v.id) ?? {},
      };
    });

    // 找到对照组
    const control = variantResults.find((r) => r.is_control) ?? null;

    let bestZ = 0;
    let bestP = 1;
    let winner: string | null = null;
    let bestConfidence = 0;

    if (control && control.participants > 0) {
      for (const vr of variantResults) {
        if (vr.is_control) continue;
        if (vr.participants === 0) continue;
        const { zScore, pValue } = twoProportionZTest(
          control.conversion_rate,
          control.participants,
          vr.conversion_rate,
          vr.participants
        );
        const confidence = 1 - pValue;
        // 取最显著且转化率高于对照组的变体
        if (confidence > bestConfidence && vr.conversion_rate > control.conversion_rate) {
          bestConfidence = confidence;
          bestZ = zScore;
          bestP = pValue;
          if (confidence >= 0.95) {
            winner = vr.variant_id;
          }
        }
      }
    }

    return {
      experiment_id: experimentId,
      variant_results: variantResults,
      confidence: bestConfidence,
      significance: bestConfidence >= 0.95,
      winner,
      z_score: bestZ,
      p_value: bestP,
      computed_at: now,
    };
  }

  // ==================== 目标定向 ====================

  /**
   * 评估用户是否满足定向规则
   *
   * 所有规则为 AND 关系，全部满足才返回 true。
   * 无规则时返回 true。
   */
  matchesTargeting(rules: TargetingRule[], attributes?: Record<string, unknown>): boolean {
    if (!rules || rules.length === 0) return true;
    if (!attributes) return false;
    return rules.every((rule) => {
      const val = attributes[rule.field];
      return this.evaluateRule(val, rule.operator, rule.value);
    });
  }

  private evaluateRule(actual: unknown, operator: TargetingOperator, expected: unknown): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'ne':
        return actual !== expected;
      case 'gt':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'lt':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'gte':
        return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
      case 'lte':
        return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      case 'contains':
        return (
          typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected)
        );
      default:
        return false;
    }
  }

  // ==================== 订阅与持久化 ====================

  /** 订阅引擎状态变化（实验/分配/转化变更） */
  onChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /** 清空所有数据（慎用） */
  reset(): void {
    this.experiments.clear();
    this.assignments.clear();
    this.conversions = [];
    this.persist();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        abLogger.error('A/B 测试监听器执行失败:', err);
      }
    });
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = {
        experiments: Array.from(this.experiments.values()),
        assignments: Array.from(this.assignments.values()),
        conversions: this.conversions.slice(0, MAX_EVENTS),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      abLogger.warn('持久化 A/B 测试数据失败:', err);
    }
  }

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        experiments: Experiment[];
        assignments: AssignmentRecord[];
        conversions: ConversionEvent[];
      };
      for (const exp of data.experiments ?? []) {
        this.experiments.set(exp.id, exp);
      }
      for (const rec of data.assignments ?? []) {
        this.assignments.set(`${rec.experiment_id}:${rec.user_id}`, rec);
      }
      this.conversions = (data.conversions ?? []).slice(0, MAX_EVENTS);
    } catch (err) {
      abLogger.warn('加载 A/B 测试数据失败:', err);
    }
  }
}

// ==================== 单例 ====================

/** A/B 测试引擎单例 */
export const abTestEngine = new ABTestEngine();

export default abTestEngine;
