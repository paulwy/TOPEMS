/**
 * V53.0 前端 AI 增强 — 入口点
 *
 * 统一导出所有 AI 增强模块
 */

export {
  IntelligentCodeCompletion,
  intelligentCodeCompletion,
  CompletionKind,
  type CompletionContext,
  type CompletionItem,
  type SnippetDefinition,
  type ComponentPropInfo,
  type APIEndpointInfo,
} from './code-completion';

export {
  AutoTestGenerator,
  autoTestGenerator,
  type TestCase,
  type TestMethod,
  type TestSuite,
  type AnalysisResult,
  type TestFramework,
  type TestType,
  type AssertionStrategy,
} from './test-generator';

export {
  UIComponentRecommender,
  uiComponentRecommender,
  type IntentContext,
  type IntentCategory,
  type ComponentRecommendation,
  type ComponentMeta,
  type ThemeMode,
} from './ui-recommender';

export { V53AIPanel } from './v53-ai-panel';
