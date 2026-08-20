/**
 * V53.0 前端 AI 增强 — 入口点
 *
 * 统一导出所有 AI 增强模块
 */

export type {
  CompletionContext,
  CompletionItem,
  SnippetDefinition,
  ComponentPropInfo,
  APIEndpointInfo,
} from './code-completion';

export type {
  TestCase,
  TestMethod,
  TestSuite,
  AnalysisResult,
  TestFramework,
  TestType,
  AssertionStrategy,
} from './test-generator';

export type {
  IntentContext,
  IntentCategory,
  ComponentRecommendation,
  ComponentMeta,
  ThemeMode,
} from './ui-recommender';

export { V53AIPanel } from './v53-ai-panel';
