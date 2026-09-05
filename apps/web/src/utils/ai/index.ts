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

import { codeCompletionEngine } from './codeCompletion';
import { testGenerator } from './testGenerator';
import { uiRecommender } from './uiRecommender';

export {
  CodeCompletionEngine,
  codeCompletionEngine,
  default as codeCompletionDefault,
} from './codeCompletion';

export type {
  CompletionContext,
  CompletionSuggestion,
  CompletionHistoryEntry,
  CodeSnippet,
  VariableInfo,
  ImportInfo,
} from './codeCompletion';

export { CompletionType, CompletionMode } from './codeCompletion';

// ============ 自动化测试生成 ============

export { TestGenerator, testGenerator, default as testGeneratorDefault } from './testGenerator';

export type {
  TestGenerationRequest,
  GeneratedTest,
  TestCase,
  FunctionSignature,
  FunctionParameter,
  CoverageAnalysis,
  EdgeCase,
  MockFunctionDef,
} from './testGenerator';

export { TestFramework, TestType, MockStrategy, TestCaseDesignMethod } from './testGenerator';

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

// ============ 统一 AI 工具集 ============

const aiToolkit = {
  completion: codeCompletionEngine,
  testing: testGenerator,
  ui: uiRecommender,
};

export default aiToolkit;
