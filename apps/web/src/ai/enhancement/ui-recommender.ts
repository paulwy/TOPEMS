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

const COMPONENT_REGISTRY: ComponentMeta[] = [
  {
    name: 'V51Button',
    category: 'action',
    description: i18n.t('ai.ui-recommender.k0'),
    keywords: [
      'button',
      'btn',
      'click',
      'action',
      'submit',
      i18n.t('ai.ui-recommender.k2'),
      i18n.t('ai.ui-recommender.k1'),
    ],
    a11y_features: [
      'role="button"',
      i18n.t('ai.ui-recommender.arialabel_0'),
      i18n.t('ai.ui-recommender.k3'),
    ],
    responsive_support: 'full',
    theme_support: 'full',
    performance_impact: 'low',
    dependencies: ['@mui/material'],
    usage_count: 452,
    file_size_kb: 2.1,
  },
  {
    name: 'V51Card',
    category: 'display',
    description: i18n.t('ai.ui-recommender.k4'),
    keywords: [
      'card',
      'container',
      'panel',
      'box',
      i18n.t('ai.ui-recommender.k6'),
      i18n.t('ai.ui-recommender.k5'),
    ],
    a11y_features: [i18n.t('ai.ui-recommender.k7'), i18n.t('ai.ui-recommender.arialabel_1')],
    responsive_support: 'full',
    theme_support: 'full',
    performance_impact: 'low',
    dependencies: ['@mui/material'],
    usage_count: 328,
    file_size_kb: 1.8,
  },
  {
    name: 'V51Input',
    category: 'data-entry',
    description: i18n.t('ai.ui-recommender.k8'),
    keywords: [
      'input',
      'text',
      'field',
      'form',
      i18n.t('ai.ui-recommender.k10'),
      i18n.t('ai.ui-recommender.k9'),
    ],
    a11y_features: [
      i18n.t('ai.ui-recommender.label_2'),
      'aria-invalid',
      i18n.t('ai.ui-recommender.k11'),
    ],
    responsive_support: 'full',
    theme_support: 'full',
    performance_impact: 'low',
    dependencies: ['@mui/material'],
    usage_count: 289,
    file_size_kb: 3.2,
  },
  {
    name: 'V51Select',
    category: 'data-entry',
    description: i18n.t('ai.ui-recommender.k12'),
    keywords: [
      'select',
      'dropdown',
      'picker',
      i18n.t('ai.ui-recommender.k14'),
      i18n.t('ai.ui-recommender.k13'),
    ],
    a11y_features: ['role="listbox"', i18n.t('ai.ui-recommender.k15'), 'aria-expanded'],
    responsive_support: 'full',
    theme_support: 'full',
    performance_impact: 'low',
    dependencies: ['@mui/material'],
    usage_count: 156,
    file_size_kb: 4.5,
  },
  {
    name: 'V51Tabs',
    category: 'navigation',
    description: i18n.t('ai.ui-recommender.k16'),
    keywords: [
      'tabs',
      'tab',
      'switch',
      'navigation',
      i18n.t('ai.ui-recommender.k18'),
      i18n.t('ai.ui-recommender.k17'),
    ],
    a11y_features: [
      'role="tablist"',
      'role="tab"',
      'aria-selected',
      i18n.t('ai.ui-recommender.k19'),
    ],
    responsive_support: 'partial',
    theme_support: 'full',
    performance_impact: 'low',
    dependencies: ['@mui/material'],
    usage_count: 198,
    file_size_kb: 5.2,
  },
  {
    name: 'V51Badge',
    category: 'display',
    description: i18n.t('ai.ui-recommender.k20'),
    keywords: [
      'badge',
      'tag',
      'chip',
      'label',
      i18n.t('ai.ui-recommender.k22'),
      i18n.t('ai.ui-recommender.k21'),
    ],
    a11y_features: ['aria-label', 'role="status"'],
    responsive_support: 'full',
    theme_support: 'full',
    performance_impact: 'low',
    dependencies: ['@mui/material'],
    usage_count: 212,
    file_size_kb: 1.2,
  },
  {
    name: 'V51Skeleton',
    category: 'loading',
    description: i18n.t('ai.ui-recommender.k23'),
    keywords: [
      'skeleton',
      'loading',
      'placeholder',
      i18n.t('ai.ui-recommender.k25'),
      i18n.t('ai.ui-recommender.k24'),
    ],
    a11y_features: ['aria-busy', 'aria-live'],
    responsive_support: 'full',
    theme_support: 'full',
    performance_impact: 'low',
    dependencies: ['@mui/material'],
    usage_count: 87,
    file_size_kb: 0.8,
  },
  {
    name: 'V51Avatar',
    category: 'display',
    description: i18n.t('ai.ui-recommender.k26'),
    keywords: [
      'avatar',
      'user',
      'image',
      i18n.t('ai.ui-recommender.k28'),
      i18n.t('ai.ui-recommender.k27'),
    ],
    a11y_features: ['aria-label', i18n.t('ai.ui-recommender.alt_3')],
    responsive_support: 'full',
    theme_support: 'full',
    performance_impact: 'low',
    dependencies: ['@mui/material'],
    usage_count: 134,
    file_size_kb: 1.5,
  },
];

const INTENT_KEYWORD_MAP: Record<string, string[]> = {
  button: [
    'button',
    'btn',
    'click',
    'submit',
    'confirm',
    'action',
    i18n.t('ai.ui-recommender.k30'),
    i18n.t('ai.ui-recommender.k29'),
  ],
  card: [
    'card',
    'panel',
    'container',
    'box',
    i18n.t('ai.ui-recommender.k32'),
    i18n.t('ai.ui-recommender.k31'),
  ],
  input: [
    'input',
    'text',
    'field',
    'form',
    i18n.t('ai.ui-recommender.k34'),
    i18n.t('ai.ui-recommender.k33'),
  ],
  select: [
    'select',
    'dropdown',
    'picker',
    i18n.t('ai.ui-recommender.k36'),
    i18n.t('ai.ui-recommender.k35'),
  ],
  tabs: [
    'tab',
    'switch',
    'navigate',
    i18n.t('ai.ui-recommender.k38'),
    i18n.t('ai.ui-recommender.k37'),
  ],
  badge: [
    'badge',
    'tag',
    'chip',
    'label',
    i18n.t('ai.ui-recommender.k40'),
    i18n.t('ai.ui-recommender.k39'),
  ],
  skeleton: [
    'skeleton',
    'loading',
    'placeholder',
    i18n.t('ai.ui-recommender.k42'),
    i18n.t('ai.ui-recommender.k41'),
  ],
  avatar: [
    'avatar',
    'user',
    'image',
    i18n.t('ai.ui-recommender.k44'),
    i18n.t('ai.ui-recommender.k43'),
  ],
  table: [
    'table',
    'grid',
    'list',
    'row',
    'column',
    i18n.t('ai.ui-recommender.k46'),
    i18n.t('ai.ui-recommender.k45'),
  ],
  dialog: [
    'dialog',
    'modal',
    'popup',
    'overlay',
    i18n.t('ai.ui-recommender.k48'),
    i18n.t('ai.ui-recommender.k47'),
  ],
  toast: [
    'toast',
    'snackbar',
    'notification',
    'alert',
    i18n.t('ai.ui-recommender.k50'),
    i18n.t('ai.ui-recommender.k49'),
  ],
  toolbar: [
    'toolbar',
    'appbar',
    'header',
    i18n.t('ai.ui-recommender.k52'),
    i18n.t('ai.ui-recommender.k51'),
  ],
  sidebar: [
    'sidebar',
    'drawer',
    'navigation',
    i18n.t('ai.ui-recommender.k54'),
    i18n.t('ai.ui-recommender.k53'),
  ],
  form: [
    'form',
    'input',
    'field',
    'submit',
    i18n.t('ai.ui-recommender.k56'),
    i18n.t('ai.ui-recommender.k55'),
  ],
  chart: [
    'chart',
    'graph',
    'diagram',
    i18n.t('ai.ui-recommender.k58'),
    i18n.t('ai.ui-recommender.k57'),
  ],
};

const CATEGORY_INTENT_MAP: Record<IntentCategory, string[]> = {
  navigation: ['tabs', 'sidebar', 'toolbar', 'link', 'breadcrumb', 'pagination'],
  layout: ['container', 'grid', 'stack', 'divider', 'expansion'],
  form: ['input', 'select', 'checkbox', 'radio', 'switch', 'slider', 'datepicker'],
  display: ['card', 'avatar', 'badge', 'chip', 'tooltip', 'table', 'list'],
  feedback: ['alert', 'snackbar', 'progress', 'skeleton', 'spinner'],
  overlay: ['dialog', 'popover', 'menu', 'tooltip', 'modal', 'drawer'],
  'data-entry': ['input', 'select', 'textarea', 'datepicker', 'fileupload', 'rating'],
  'data-display': ['table', 'datagrid', 'list', 'card', 'tree', 'timeline'],
  media: ['avatar', 'image', 'icon', 'video', 'audio'],
  action: ['button', 'iconbutton', 'fab', 'toggle', 'button'],
  loading: ['skeleton', 'spinner', 'progress', 'circular', 'linear'],
  notification: ['snackbar', 'alert', 'toast', 'banner'],
};

