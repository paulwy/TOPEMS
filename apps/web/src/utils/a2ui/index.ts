/**
 * V50.0 前端 A2UI — AI 生成 UI + 自动测试 + 智能代码审查
 *
 * 统一导出 A2UI 模块的所有功能:
 * - ai-ui-generator: AI 生成 UI（文本→UI、设计→UI、响应式布局）
 * - auto-test-generator: 自动测试生成（单元测试、集成测试、Mock 生成）
 * - smart-code-reviewer: 智能代码审查（质量分析、安全扫描、性能检测）
 */

// ==================== AI 生成 UI ====================
export {
  AIUIGenerator,
  aiUiGenerator,
  UIGenerationMode,
  LayoutStrategy,
  ComponentLevel,
  type DesignConstraints,
  type ResponsiveBreakpoint,
  type ThemeConfig,
  type UIGenerationResult,
  type AccessibilityReport,
  type GenerateOptions,
  type GeneratedComponent,
} from './ai-ui-generator';

// ==================== 自动测试生成 ====================
export {
  AutoTestGenerator,
  autoTestGenerator,
  TestGenerationStrategy,
  TestPriority,
  MockType,
  TestStatus,
  type AutoTestRequest,
  type GeneratedTestSuite,
  type TestCaseInfo,
  type MockDefinition,
  type CoverageEstimate,
  type TestGenerationOptions,
  type GeneratedTest,
} from './auto-test-generator';

// ==================== 智能代码审查 ====================
export {
  SmartCodeReviewer,
  smartCodeReviewer,
  ReviewSeverity,
  ReviewCategory,
  FixDifficulty,
  ReviewStatus,
  type CodeReviewRequest,
  type CodeReviewResult,
  type ReviewIssue,
  type FixSuggestion,
  type CodeMetrics,
} from './smart-code-reviewer';

export { default as defaultAiUiGenerator } from './ai-ui-generator';
export { default as defaultAutoTestGenerator } from './auto-test-generator';
export { default as defaultSmartCodeReviewer } from './smart-code-reviewer';
