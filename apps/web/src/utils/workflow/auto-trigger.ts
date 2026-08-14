/**
 * V48.0 前端智能编排 — 自动化触发引擎
 *
 * 管理工作流的触发器并提供智能触发建议，支持:
 * - 定时 / 事件 / Webhook / 数据变更 / 阈值 / 手动 / 复合触发器
 * - 触发条件评估与执行
 * - 触发历史与统计
 * - 基于工作流模式的智能触发建议
 * - 异常模式检测与阈值触发器推荐
 *
 * @example
 * import { autoTriggerEngine } from '@/utils/workflow';
 *
 * autoTriggerEngine.createTrigger({
 *   trigger_id: 't-1',
 *   name: '每日巡检',
 *   type: TriggerType.SCHEDULE,
 *   config: { cron_expression: '0 9 * * *', timezone: 'Asia/Shanghai' },
 *   enabled: true,
 *   fire_count: 0,
 *   workflow_id: 'wf-1',
 * });
 */

import { NodeType, type Workflow } from './workflow-editor';
import i18n from '@/i18n';

// ==================== 枚举 ====================

export enum TriggerType {
  SCHEDULE = 'schedule',
  EVENT = 'event',
  WEBHOOK = 'webhook',
  DATACHANGE = 'data-change',
  THRESHOLD = 'threshold',
  MANUAL = 'manual',
  COMPOUND = 'compound',
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
}

export enum TriggerFireResult {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

// ==================== 接口 ====================

export interface ScheduleConfig {
  cron_expression: string;
  timezone: string;
  start_date?: number;
  end_date?: number;
}

export interface EventConfig {
  event_type: string;
  source: string;
  filter?: Record<string, unknown>;
  condition?: string;
}

export interface WebhookConfig {
  webhook_id: string;
  secret?: string;
  allowed_ips?: string[];
  rate_limit?: number;
}

export interface DataChangeConfig {
  entity: string;
  operation: 'create' | 'update' | 'delete';
  fields?: string[];
  condition?: string;
}

export interface ThresholdConfig {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  value: number;
  window_size: number;
  consecutive_count: number;
}

export interface CompoundConfig {
  operator: LogicalOperator;
  sub_triggers: string[];
}

export type TriggerConfig =
  | ScheduleConfig
  | EventConfig
  | WebhookConfig
  | DataChangeConfig
  | ThresholdConfig
  | CompoundConfig;

export interface Trigger {
  trigger_id: string;
  name: string;
  type: TriggerType;
  config: TriggerConfig;
  enabled: boolean;
  last_fired: number | null;
  fire_count: number;
  workflow_id: string;
}

export interface TriggerHistory {
  history_id: string;
  trigger_id: string;
  workflow_id: string;
  fired_at: number;
  result: TriggerFireResult;
  payload: Record<string, unknown>;
  error?: string;
}

export interface TriggerStats {
  trigger_id: string;
  total_fires: number;
  success_count: number;
  failed_count: number;
  skip_count: number;
  last_fired: number | null;
  avg_interval_ms: number;
  success_rate: number;
}

export interface TriggerSuggestion {
  trigger_type: TriggerType;
  name: string;
  confidence: number;
  config: Partial<TriggerConfig>;
  reason: string;
}

export interface AnomalyDetection {
  metric: string;
  avg_value: number;
  current_value: number;
  deviation: number;
  suggested_threshold: number;
  trigger_name: string;
}

// ==================== 触发引擎 ====================

export class AutoTriggerEngine {
  private triggers: Map<string, Trigger> = new Map();
  private histories: TriggerHistory[] = [];
  private metricSamples: Map<string, number[]> = new Map();

  // ==================== 触发器管理 ====================

  createTrigger(trigger: Omit<Trigger, 'last_fired' | 'fire_count'>): Trigger | null {
    if (this.triggers.has(trigger.trigger_id)) return null;
    const newTrigger: Trigger = {
      ...trigger,
      config: { ...trigger.config } as TriggerConfig,
      last_fired: null,
      fire_count: 0,
    };
    this.triggers.set(trigger.trigger_id, newTrigger);
    return { ...newTrigger };
  }

  updateTrigger(triggerId: string, updates: Partial<Omit<Trigger, 'trigger_id'>>): Trigger | null {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return null;
    if (updates.name !== undefined) trigger.name = updates.name;
    if (updates.type !== undefined) trigger.type = updates.type;
    if (updates.config !== undefined) trigger.config = { ...updates.config } as TriggerConfig;
    if (updates.enabled !== undefined) trigger.enabled = updates.enabled;
    if (updates.workflow_id !== undefined) trigger.workflow_id = updates.workflow_id;
    return { ...trigger };
  }

  deleteTrigger(triggerId: string): boolean {
    return this.triggers.delete(triggerId);
  }

  enableTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;
    trigger.enabled = true;
    return true;
  }

  disableTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;
    trigger.enabled = false;
    return true;
  }

  getTrigger(triggerId: string): Trigger | undefined {
    const trigger = this.triggers.get(triggerId);
    return trigger ? { ...trigger } : undefined;
  }

  listTriggers(workflowId?: string): Trigger[] {
    const all = Array.from(this.triggers.values()).map((t) => ({ ...t }));
    if (workflowId) return all.filter((t) => t.workflow_id === workflowId);
    return all;
  }

  // ==================== 触发评估 ====================

  evaluateTrigger(triggerId: string, context: Record<string, unknown>): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger || !trigger.enabled) return false;

    switch (trigger.type) {
      case TriggerType.SCHEDULE: {
        const config = trigger.config as ScheduleConfig;
        const now = Date.now();
        if (config.start_date && now < config.start_date) return false;
        if (config.end_date && now > config.end_date) return false;
        return true;
      }
      case TriggerType.EVENT: {
        const config = trigger.config as EventConfig;
        if (context.event_type !== config.event_type) return false;
        if (context.source !== config.source) return false;
        if (config.filter) {
          for (const [key, value] of Object.entries(config.filter)) {
            if (context[key] !== value) return false;
          }
        }
        return true;
      }
      case TriggerType.WEBHOOK: {
        const config = trigger.config as WebhookConfig;
        if (
          config.allowed_ips &&
          config.allowed_ips.length > 0 &&
          !config.allowed_ips.includes(context.ip as string)
        ) {
          return false;
        }
        return true;
      }
      case TriggerType.DATACHANGE: {
        const config = trigger.config as DataChangeConfig;
        if (context.entity !== config.entity) return false;
        if (context.operation !== config.operation) return false;
        return true;
      }
      case TriggerType.THRESHOLD: {
        const config = trigger.config as ThresholdConfig;
        const value = Number(context[config.metric]);
        if (Number.isNaN(value)) return false;
        return this.compareThreshold(value, config.operator, config.value);
      }
      case TriggerType.MANUAL: {
        return true;
      }
      case TriggerType.COMPOUND: {
        const config = trigger.config as CompoundConfig;
        const results = config.sub_triggers.map((subId) => this.evaluateTrigger(subId, context));
        return config.operator === LogicalOperator.AND
          ? results.every(Boolean)
          : results.some(Boolean);
      }
      default:
        return false;
    }
  }

  private compareThreshold(
    value: number,
    operator: ThresholdConfig['operator'],
    threshold: number
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  fireTrigger(triggerId: string, payload: Record<string, unknown> = {}): TriggerHistory {
    const trigger = this.triggers.get(triggerId);
    const now = Date.now();
    const historyId = `h-${now}-${Math.random().toString(36).slice(2, 8)}`;

    if (!trigger || !trigger.enabled) {
      const history: TriggerHistory = {
        history_id: historyId,
        trigger_id: triggerId,
        workflow_id: trigger?.workflow_id || '',
        fired_at: now,
        result: TriggerFireResult.SKIPPED,
        payload,
        error: !trigger ? i18n.t('shared.auto-trigger.k1') : i18n.t('shared.auto-trigger.k0'),
      };
      this.histories.push(history);
      return { ...history };
    }

    trigger.last_fired = now;
    trigger.fire_count += 1;

    const history: TriggerHistory = {
      history_id: historyId,
      trigger_id: triggerId,
      workflow_id: trigger.workflow_id,
      fired_at: now,
      result: TriggerFireResult.SUCCESS,
      payload,
    };
    this.histories.push(history);
    return { ...history };
  }

  getTriggerHistory(triggerId?: string, limit: number = 50): TriggerHistory[] {
    const filtered = triggerId
      ? this.histories.filter((h) => h.trigger_id === triggerId)
      : this.histories;
    return filtered
      .slice(-limit)
      .reverse()
      .map((h) => ({ ...h }));
  }

  getTriggerStats(triggerId: string): TriggerStats | null {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return null;
    const triggerHistory = this.histories.filter((h) => h.trigger_id === triggerId);
    const successCount = triggerHistory.filter(
      (h) => h.result === TriggerFireResult.SUCCESS
    ).length;
    const failedCount = triggerHistory.filter((h) => h.result === TriggerFireResult.FAILED).length;
    const skipCount = triggerHistory.filter((h) => h.result === TriggerFireResult.SKIPPED).length;

    let avgInterval = 0;
    if (triggerHistory.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < triggerHistory.length; i++) {
        intervals.push(triggerHistory[i].fired_at - triggerHistory[i - 1].fired_at);
      }
      avgInterval = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    }

    return {
      trigger_id: triggerId,
      total_fires: trigger.fire_count,
      success_count: successCount,
      failed_count: failedCount,
      skip_count: skipCount,
      last_fired: trigger.last_fired,
      avg_interval_ms: avgInterval,
      success_rate: trigger.fire_count > 0 ? successCount / trigger.fire_count : 0,
    };
  }

  // ==================== 智能触发建议 ====================

  suggestTriggers(workflow: Workflow): TriggerSuggestion[] {
    const suggestions: TriggerSuggestion[] = [];
    const nodeTypes = workflow.nodes.map((n) => n.type);

    // 包含 HTTPRequest / DatabaseQuery → 建议 Webhook 触发
    if (nodeTypes.includes(NodeType.HTTPREQUEST) || nodeTypes.includes(NodeType.DATABASEQUERY)) {
      suggestions.push({
        trigger_type: TriggerType.WEBHOOK,
        name: `${workflow.name}${i18n.t('shared.auto-trigger.webhook_0')}`,
        confidence: 0.85,
        config: {
          webhook_id: `wh-${workflow.workflow_id}`,
          rate_limit: 100,
        } as Partial<WebhookConfig>,
        reason: i18n.t('shared.auto-trigger.k2'),
      });
    }

    // 包含定时巡检类节点 → 建议定时触发
    if (nodeTypes.includes(NodeType.DELAY) || nodeTypes.includes(NodeType.LOOP)) {
      suggestions.push({
        trigger_type: TriggerType.SCHEDULE,
        name: `${workflow.name}${i18n.t('shared.auto-trigger.k1')}`,
        confidence: 0.75,
        config: {
          cron_expression: '0 9 * * *',
          timezone: 'Asia/Shanghai',
        } as Partial<ScheduleConfig>,
        reason: i18n.t('shared.auto-trigger.k3'),
      });
    }

    // 包含 Notify 节点 → 建议事件触发
    if (nodeTypes.includes(NodeType.NOTIFY)) {
      suggestions.push({
        trigger_type: TriggerType.EVENT,
        name: `${workflow.name}${i18n.t('shared.auto-trigger.k2')}`,
        confidence: 0.7,
        config: {
          event_type: 'alert',
          source: 'system',
        } as Partial<EventConfig>,
        reason: i18n.t('shared.auto-trigger.k4'),
      });
    }

    // 包含 AI / Aggregate → 建议数据变更触发
    if (nodeTypes.includes(NodeType.AGGREGATE) || nodeTypes.includes(NodeType.AI)) {
      suggestions.push({
        trigger_type: TriggerType.DATACHANGE,
        name: `${workflow.name}${i18n.t('shared.auto-trigger.k3')}`,
        confidence: 0.8,
        config: {
          entity: 'metrics',
          operation: 'update',
        } as Partial<DataChangeConfig>,
        reason: i18n.t('shared.auto-trigger.k5'),
      });
    }

    // 默认建议手动触发
    if (suggestions.length === 0) {
      suggestions.push({
        trigger_type: TriggerType.MANUAL,
        name: `${workflow.name}${i18n.t('shared.auto-trigger.k4')}`,
        confidence: 0.5,
        config: {},
        reason: i18n.t('shared.auto-trigger.k6'),
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  detectAnomalyTriggers(metricName: string, currentValue: number): AnomalyDetection | null {
    const samples = this.metricSamples.get(metricName) || [];
    if (samples.length < 5) return null;

    const avg = samples.reduce((sum, v) => sum + v, 0) / samples.length;
    const variance = samples.reduce((sum, v) => sum + (v - avg) ** 2, 0) / samples.length;
    const stdDev = Math.sqrt(variance);
    const deviation = stdDev > 0 ? Math.abs(currentValue - avg) / stdDev : 0;

    // 偏离 2 个标准差以上视为异常
    if (deviation < 2) return null;

    const suggestedThreshold = avg + stdDev * 2;
    return {
      metric: metricName,
      avg_value: Number(avg.toFixed(2)),
      current_value: currentValue,
      deviation: Number(deviation.toFixed(2)),
      suggested_threshold: Number(suggestedThreshold.toFixed(2)),
      trigger_name: `${metricName}${i18n.t('shared.auto-trigger.k5')}`,
    };
  }

  recordMetricSample(metricName: string, value: number): void {
    const samples = this.metricSamples.get(metricName) || [];
    samples.push(value);
    // 仅保留最近 100 个样本
    if (samples.length > 100) samples.shift();
    this.metricSamples.set(metricName, samples);
  }

  getMetricSamples(metricName: string): number[] {
    return [...(this.metricSamples.get(metricName) || [])];
  }

  // ==================== Webhook 校验 ====================

  validateWebhook(triggerId: string, signature: string, payload: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger || trigger.type !== TriggerType.WEBHOOK) return false;
    const config = trigger.config as WebhookConfig;
    if (!config.secret) return true; // 无密钥则跳过校验
    // 简化校验：实际应使用 HMAC
    return signature.length > 0 && payload.length > 0;
  }

  // ==================== Cron 工具 ====================

  getNextFireTime(triggerId: string): number | null {
    const trigger = this.triggers.get(triggerId);
    if (!trigger || trigger.type !== TriggerType.SCHEDULE) return null;
    const config = trigger.config as ScheduleConfig;
    // 简化：基于 cron 表达式估算（实际应使用 cron 解析库）
    const now = Date.now();
    const next = now + 60 * 60 * 1000; // 默认 1 小时后
    if (config.start_date && next < config.start_date) {
      return config.start_date;
    }
    if (config.end_date && next > config.end_date) return null;
    return next;
  }
}

export const autoTriggerEngine = new AutoTriggerEngine();
export default autoTriggerEngine;
