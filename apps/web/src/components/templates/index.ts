/**
 * 页面模板体系（V23.0 精简版）
 *
 * 分层结构：
 * - core/       5 个核心模板（覆盖 80% 场景，默认导入）
 * - extensions/ 10 个扩展模板（按需导入，支持 lazy load）
 *
 * 使用建议：
 * - 优先使用核心模板
 * - 核心模板无法满足时，引入对应扩展
 * - 使用 TemplateSelector 自动推荐合适模板
 */

// 核心模板
export * from './core';

// 扩展模板（按需导入，建议使用动态 import）
export * from './extensions';

// 通用组件
export { PageHeader } from './PageHeader';
export type { BreadcrumbItem, PageAction, PageHeaderProps } from './PageHeader';

// 表单内嵌子表组件
export { SubTableBuilder } from './SubTableBuilder';
export { default as SubTableBuilderDefault } from './SubTableBuilder';

// 树形视图组件
export { TreeBuilder } from './TreeBuilder';
export { default as TreeBuilderDefault } from './TreeBuilder';

// 向导表单组件
export { WizardBuilder } from './WizardBuilder';
export { default as WizardBuilderDefault } from './WizardBuilder';

// 向后兼容别名导出（原 index.ts 中存在，部分业务页面在使用的别名）
// 这些类型在 core/extensions 分层中未导出，单独保留以维持兼容性
export type { StatCard as TreeStatCard } from './TreePageTemplate';
export type { StatCard as StatsStatCard } from './StatsPageTemplate';
export type { FilterConfig as CardFilterConfig } from './CardListTemplate';
export type {
  SortConfig as MasterSortConfig,
  PaginationConfig as MasterPaginationConfig,
} from './MasterDetailPageTemplate';

// 模板分类与推荐
export {
  TEMPLATE_CLASSIFICATIONS,
  CORE_TEMPLATES,
  EXTENSION_TEMPLATES,
  CORE_8_TEMPLATES,
  getTemplateByType,
  getTemplatesByCategory,
  getHighFrequencyTemplates,
  recommendTemplate,
} from './classification';
export type { PageTemplateType } from './classification';

// 模板辅助工具
export { default as TemplateDemoPage } from './TemplateDemoPage';
