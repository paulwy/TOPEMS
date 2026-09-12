/**
 * V47.0 前端 AI 增强工具 — 统一导出
 *
 * 模块包含：
 * - UIRecommender：UI 组件推荐器
 *
 * 使用方式：
 * ```ts
 * import { uiRecommender } from '@/utils/ai';
 * ```
 */

// ============ UI 组件推荐 ============

export { UIRecommender, uiRecommender, default as uiRecommenderDefault } from './uiRecommender';

export type {
  ComponentRecommendation,
  DesignAnalysis,
  RecommendationContext,
  ComponentKnowledge,
  ComponentComposition,
  AlternativeComponent,
  AccessibilitySuggestion,
} from './uiRecommender';

export { ComponentCategory, UILibrary, ResponsiveStrategy } from './uiRecommender';
