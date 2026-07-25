/**
 * V48.0 微前端 AI 驱动 — 智能路由推荐 + 自动化运维 + 预测性扩展
 *
 * 统一导出 AI 驱动模块的所有功能:
 * - smart-router: 智能路由推荐（用户行为画像 + 导航模式 + 路由预测 + 预加载）
 * - auto-ops: 自动化运维（规则引擎 + 触发器 + 动作执行 + 维护窗口 + 仪表盘）
 * - predictive-scaler: 预测性扩展（指标采集 + 模型训练 + 负载预测 + 容量规划 + 策略优化）
 *
 * @example
 * import {
 *   smartRouter,
 *   autoOps,
 *   predictiveScaler,
 *   SmartRouter,
 *   AutoOps,
 *   PredictiveScaler,
 *   RecommendationStrategy,
 *   OpsActionType,
 *   ScalingAction,
 * } from '@/microfrontend/ai-driven';
 */

// ==================== 智能路由推荐 ====================
export {
  smartRouter,
  SmartRouter,
  RecommendationStrategy,
  type RouteRecommendation,
  type UserBehaviorProfile,
  type NavigationPattern,
  type RouteMetrics,
  type SmartRouterConfig,
  type SmartRouterStats,
} from './smart-router';

// ==================== 自动化运维 ====================
export {
  autoOps,
  AutoOps,
  OpsActionType,
  TriggerType,
  OpsStatus,
  type OpsAction,
  type OpsTrigger,
  type OpsRule,
  type OpsExecutionResult,
  type OpsDashboard,
  type AutoOpsConfig,
  type MaintenanceWindow,
} from './auto-ops';

// ==================== 预测性扩展 ====================
export {
  predictiveScaler,
  PredictiveScaler,
  ScalingAction,
  ModelAlgorithm,
  type ScalingMetric,
  type ScalingPrediction,
  type ScalingModel,
  type ScalingPolicy,
  type CapacityPlan,
  type PredictiveScalerConfig,
  type PredictiveScalerStats,
  type ScalingHistoryEntry,
} from './predictive-scaler';
