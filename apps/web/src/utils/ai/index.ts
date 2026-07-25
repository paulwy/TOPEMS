/**
 * V47.0 前端 AI 增强工具 — 统一导出
 *
 * 模块包含：
 * - CodeCompletionEngine：智能代码补全引擎
 * - TestGenerator：自动化测试生成器
 * - UIRecommender：UI 组件推荐器
 *
 * 使用方式：
 * ```ts
 * import { codeCompletionEngine, testGenerator, uiRecommender } from '@/utils/ai';
 * ```
 */

// ============ 智能代码补全 ============

import { codeCompletionEngine } from './code-completion';
import { testGenerator } from './test-generator';
import { uiRecommender } from './ui-recommender';

export {
  CodeCompletionEngine,
  codeCompletionEngine,
  default as codeCompletionDefault,
} from './code-completion';

export type {
  CompletionContext,
  CompletionSuggestion,
  CompletionHistoryEntry,
  CodeSnippet,
  VariableInfo,
  ImportInfo,
} from './code-completion';

export { CompletionType, CompletionMode } from './code-completion';

// ============ 自动化测试生成 ============

export { TestGenerator, testGenerator, default as testGeneratorDefault } from './test-generator';

export type {
  TestGenerationRequest,
  GeneratedTest,
  TestCase,
  FunctionSignature,
  FunctionParameter,
  CoverageAnalysis,
  EdgeCase,
  MockFunctionDef,
} from './test-generator';

export { TestFramework, TestType, MockStrategy, TestCaseDesignMethod } from './test-generator';

// ============ UI 组件推荐 ============

export { UIRecommender, uiRecommender, default as uiRecommenderDefault } from './ui-recommender';

export type {
  ComponentRecommendation,
  DesignAnalysis,
  RecommendationContext,
  ComponentKnowledge,
  ComponentComposition,
  AlternativeComponent,
  AccessibilitySuggestion,
} from './ui-recommender';

export { ComponentCategory, UILibrary, ResponsiveStrategy } from './ui-recommender';

// ============ 统一 AI 工具集 ============

export const aiToolkit = {
  completion: codeCompletionEngine,
  testing: testGenerator,
  ui: uiRecommender,
};

export default aiToolkit;
