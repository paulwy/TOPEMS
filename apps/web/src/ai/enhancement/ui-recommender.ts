import i18n from '@/i18n';
/**
 * V53.0 前端 AI 增强 — UI 组件推荐
 *
 * 提供智能 UI 组件推荐能力：
 * - 基于意图的组件推荐
 * - 设计系统组件匹配
 * - 无障碍需求检查
 * - 响应式布局建议
 * - 主题一致性组件选择
 * - 组件使用分析
 */

export type IntentCategory =
  | 'navigation'
  | 'layout'
  | 'form'
  | 'display'
  | 'feedback'
  | 'overlay'
  | 'data-entry'
  | 'data-display'
  | 'media'
  | 'action'
  | 'loading'
  | 'notification';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface IntentContext {
  description: string;
  category?: IntentCategory;
  keywords?: string[];
  containerType?: 'page' | 'section' | 'card' | 'dialog' | 'sidebar';
  responsive?: boolean;
  a11yRequirements?: string[];
  themeMode?: ThemeMode;
  dataShape?: 'list' | 'grid' | 'form' | 'detail' | 'empty';
  priority?: 'performance' | 'accessibility' | 'consistency' | 'simplicity';
}

export interface ComponentRecommendation {
  component: string;
  reason: string;
  alternatives: Array<{
    name: string;
    pros: string;
    cons: string;
  }>;
  a11y_notes: string[];
}

export interface ComponentMeta {
  name: string;
  category: IntentCategory;
  description: string;
  keywords: string[];
  a11y_features: string[];
  responsive_support: 'full' | 'partial' | 'none';
  theme_support: 'full' | 'partial' | 'none';
  performance_impact: 'low' | 'medium' | 'high';
  dependencies: string[];
  usage_count: number;
  file_size_kb: number;
}
