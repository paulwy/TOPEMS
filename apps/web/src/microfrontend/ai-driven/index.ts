/**
 * V51 AI-Driven Microfrontends - 智能驱动子模块
 *
 * 导出三个核心能力模块：
 *   1. Smart Router - 智能路由推荐（基于用户行为 + 实时指标）
 *   2. Auto Ops - 自动化运维（规则引擎 + 触发器 + 维护窗口）
 *   3. Predictive Scaler - 预测性扩缩（指标预测 + 模型驱动）
 *
 * @module
 */

// ==================== 智能路由推荐 ====================
export {
  type RouteRecommendation,
  type UserBehaviorProfile,
  type NavigationPattern,
  type RouteMetrics,
  type SmartRouterConfig,
  type SmartRouterStats,
} from './smart-router';

// ==================== 自动化运维 ====================
export {
  TriggerType,
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
  ScalingAction,
  type ScalingMetric,
  type ScalingPrediction,
  type ScalingModel,
  type ScalingPolicy,
  type CapacityPlan,
  type PredictiveScalerConfig,
  type PredictiveScalerStats,
  type ScalingHistoryEntry,
} from './predictive-scaler';
