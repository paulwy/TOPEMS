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

export class UIComponentRecommender {
  private components: Map<string, ComponentMeta>;
  private history: Array<{
    intent: IntentContext;
    recommendations: ComponentRecommendation[];
    timestamp: number;
  }> = [];
  private maxHistory = 200;

  constructor() {
    this.components = new Map(COMPONENT_REGISTRY.map((c) => [c.name, c]));
  }

  async recommend(context: IntentContext): Promise<ComponentRecommendation[]> {
    const candidates = this.findCandidates(context);
    const scored = candidates.map((candidate) => this.scoreCandidate(candidate, context));
    const sorted = scored.sort(
      (a, b) => this.calculateScore(b, context) - this.calculateScore(a, context)
    );

    const recommendations = sorted
      .slice(0, 3)
      .map((candidate) => this.buildRecommendation(candidate, context));

    this.addToHistory(context, recommendations);
    return recommendations;
  }

  getComponentMeta(name: string): ComponentMeta | undefined {
    return this.components.get(name);
  }

  getAllComponents(): ComponentMeta[] {
    return Array.from(this.components.values());
  }

  getComponentsByCategory(category: IntentCategory): ComponentMeta[] {
    return Array.from(this.components.values()).filter((c) => c.category === category);
  }

  registerComponent(meta: ComponentMeta): void {
    this.components.set(meta.name, meta);
  }

  getUsageAnalytics(): Record<string, number> {
    const analytics: Record<string, number> = {};
    for (const [name, meta] of this.components) {
      analytics[name] = meta.usage_count;
    }
    return analytics;
  }

  getHistory(): Array<{
    intent: IntentContext;
    recommendations: ComponentRecommendation[];
    timestamp: number;
  }> {
    return [...this.history];
  }

  getA11yChecklist(componentName: string): string[] {
    const meta = this.components.get(componentName);
    if (!meta) return [];
    return meta.a11y_features;
  }

  getResponsiveNote(componentName: string, containerType?: string): string {
    const meta = this.components.get(componentName);
    if (!meta) return '';

    if (meta.responsive_support === 'none') {
      return `⚠️ ${componentName}${i18n.t('ai.ui-recommender.k4')}`;
    }
    if (meta.responsive_support === 'partial') {
      return `ℹ️ ${componentName}${i18n.t('ai.ui-recommender.k5')}`;
    }
    return `✅ ${componentName}${i18n.t('ai.ui-recommender.k6')}`;
  }

  getThemeNote(componentName: string, themeMode?: ThemeMode): string {
    const meta = this.components.get(componentName);
    if (!meta) return '';

    if (meta.theme_support === 'none') {
      return `⚠️ ${componentName}${i18n.t('ai.ui-recommender.k7')}`;
    }
    if (meta.theme_support === 'partial') {
      return `ℹ️ ${componentName}${i18n.t('ai.ui-recommender.k8')}${themeMode ?? i18n.t('ai.ui-recommender.k59')}${i18n.t('ai.ui-recommender.k9')}`;
    }
    return `✅ ${componentName}${i18n.t('ai.ui-recommender.k10')}`;
  }

  private findCandidates(context: IntentContext): ComponentMeta[] {
    const candidates: ComponentMeta[] = [];
    const keywords = [...(context.keywords ?? []), ...this.extractKeywords(context.description)];

    if (context.category) {
      const categoryComponents = this.getComponentsByCategory(context.category);
      candidates.push(...categoryComponents);
    }

    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      for (const [intents, intentsKeywords] of Object.entries(INTENT_KEYWORD_MAP)) {
        if (
          intentsKeywords.some((k) => k.toLowerCase().includes(kw) || kw.includes(k.toLowerCase()))
        ) {
          const matched = this.findComponentsByIntent(intents);
          for (const comp of matched) {
            if (!candidates.some((c) => c.name === comp.name)) {
              candidates.push(comp);
            }
          }
        }
      }

      for (const comp of this.components.values()) {
        if (
          comp.keywords.some((k) => k.toLowerCase().includes(kw) || kw.includes(k.toLowerCase())) &&
          !candidates.some((c) => c.name === comp.name)
        ) {
          candidates.push(comp);
        }
      }
    }

    if (candidates.length === 0) {
      const fallback = this.getFallbackComponents(context);
      candidates.push(...fallback);
    }

    return candidates;
  }

  private findComponentsByIntent(intent: string): ComponentMeta[] {
    const result: ComponentMeta[] = [];
    for (const comp of this.components.values()) {
      if (comp.keywords.some((k) => k.toLowerCase().includes(intent.toLowerCase()))) {
        result.push(comp);
      }
    }
    return result;
  }

  private getFallbackComponents(context: IntentContext): ComponentMeta[] {
    const result: ComponentMeta[] = [];
    const dataShapeMap: Record<string, string[]> = {
      list: ['V51Card', 'V51List'],
      grid: ['V51Card', 'V51Avatar'],
      form: ['V51Input', 'V51Select'],
      detail: ['V51Card', 'V51Badge'],
      empty: ['V51Card', 'V51Skeleton'],
    };

    if (context.dataShape) {
      const names = dataShapeMap[context.dataShape] ?? [];
      for (const name of names) {
        const comp = this.components.get(name);
        if (comp) result.push(comp);
      }
    }

    if (result.length === 0) {
      result.push(
        this.components.get('V51Card')!,
        this.components.get('V51Button')!,
        this.components.get('V51Input')!
      );
    }

    return result;
  }

  private scoreCandidate(
    candidate: ComponentMeta,
    context: IntentContext
  ): { component: ComponentMeta; score: number } {
    let score = 0;

    const descriptionLower = context.description.toLowerCase();
    for (const keyword of candidate.keywords) {
      if (descriptionLower.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }

    if (context.category && candidate.category === context.category) {
      score += 20;
    }

    if (context.responsive && candidate.responsive_support === 'full') {
      score += 15;
    } else if (context.responsive && candidate.responsive_support === 'partial') {
      score += 5;
    }

    if (context.themeMode && candidate.theme_support === 'full') {
      score += 10;
    }

    if (context.a11yRequirements && context.a11yRequirements.length > 0) {
      const a11yMatch = context.a11yRequirements.filter((req) =>
        candidate.a11y_features.some((f) => f.toLowerCase().includes(req.toLowerCase()))
      );
      score += a11yMatch.length * 5;
    }

    score += Math.min(candidate.usage_count / 50, 10);

    if (context.priority === 'performance' && candidate.performance_impact === 'low') {
      score += 8;
    }
    if (context.priority === 'accessibility' && candidate.a11y_features.length >= 2) {
      score += 8;
    }

    return { component: candidate, score };
  }

  private calculateScore(
    scored: { component: ComponentMeta; score: number },
    _context: IntentContext
  ): number {
    return scored.score;
  }

  private buildRecommendation(
    scored: { component: ComponentMeta; score: number },
    context: IntentContext
  ): ComponentRecommendation {
    const comp = scored.component;
    const alternatives = this.buildAlternatives(comp, context);
    const a11yNotes = this.buildA11yNotes(comp, context);

    return {
      component: comp.name,
      reason: this.buildReason(comp, context, scored.score),
      alternatives,
      a11y_notes: a11yNotes,
    };
  }

  private buildReason(comp: ComponentMeta, context: IntentContext, score: number): string {
    const reasons: string[] = [];

    reasons.push(`${i18n.t('ai.ui-recommender.k11')}${score}`);
    reasons.push(`${i18n.t('ai.ui-recommender.k12')}${this.translateCategory(comp.category)}`);

    const descriptionLower = context.description.toLowerCase();
    const matchedKeywords = comp.keywords.filter((k) => descriptionLower.includes(k.toLowerCase()));
    if (matchedKeywords.length > 0) {
      reasons.push(`${i18n.t('ai.ui-recommender.k13')}${matchedKeywords.join(', ')}`);
    }

    if (context.responsive && comp.responsive_support === 'full') {
      reasons.push(i18n.t('ai.ui-recommender.k60'));
    }

    if (context.a11yRequirements && context.a11yRequirements.length > 0) {
      reasons.push(
        `${i18n.t('ai.ui-recommender.k14')}${comp.a11y_features.length}${i18n.t('ai.ui-recommender.k15')}`
      );
    }

    if (comp.usage_count > 100) {
      reasons.push(
        `${i18n.t('ai.ui-recommender.k16')}${comp.usage_count}${i18n.t('ai.ui-recommender.k17')}`
      );
    }

    return reasons.join(' | ');
  }

  private buildAlternatives(
    primary: ComponentMeta,
    _context: IntentContext
  ): Array<{ name: string; pros: string; cons: string }> {
    const sameCategory = Array.from(this.components.values()).filter(
      (c) => c.category === primary.category && c.name !== primary.name
    );

    return sameCategory.slice(0, 2).map((c) => ({
      name: c.name,
      pros:
        c.performance_impact === 'low'
          ? i18n.t('ai.ui-recommender.k62')
          : i18n.t('ai.ui-recommender.k61'),
      cons: `${c.file_size_kb}${i18n.t('ai.ui-recommender.kb_18')}${c.responsive_support !== 'full' ? i18n.t('ai.ui-recommender.k64') : i18n.t('ai.ui-recommender.k63')}`,
    }));
  }

  private buildA11yNotes(comp: ComponentMeta, context: IntentContext): string[] {
    const notes: string[] = [...comp.a11y_features];

    if (context.a11yRequirements) {
      for (const req of context.a11yRequirements) {
        const hasSupport = comp.a11y_features.some((f) =>
          f.toLowerCase().includes(req.toLowerCase())
        );
        if (!hasSupport) {
          notes.push(`${i18n.t('ai.ui-recommender.k19')}${req}`);
        }
      }
    }

    if (comp.responsive_support !== 'full') {
      notes.push(i18n.t('ai.ui-recommender.k65'));
    }

    return notes;
  }

  private extractKeywords(description: string): string[] {
    const keywords = description
      .toLowerCase()
      .split(/[\s,，。、;；:：!！?？.。]+/)
      .filter((w) => w.length > 1);
    return keywords.slice(0, 5);
  }

  private translateCategory(category: IntentCategory): string {
    const translations: Record<IntentCategory, string> = {
      navigation: i18n.t('ai.ui-recommender.k66'),
      layout: i18n.t('ai.ui-recommender.k67'),
      form: i18n.t('ai.ui-recommender.k68'),
      display: i18n.t('ai.ui-recommender.k69'),
      feedback: i18n.t('ai.ui-recommender.k70'),
      overlay: i18n.t('ai.ui-recommender.k71'),
      'data-entry': i18n.t('ai.ui-recommender.k72'),
      'data-display': i18n.t('ai.ui-recommender.k73'),
      media: i18n.t('ai.ui-recommender.k74'),
      action: i18n.t('ai.ui-recommender.k75'),
      loading: i18n.t('ai.ui-recommender.k76'),
      notification: i18n.t('ai.ui-recommender.k77'),
    };
    return translations[category];
  }

  private addToHistory(intent: IntentContext, recommendations: ComponentRecommendation[]): void {
    this.history.push({
      intent,
      recommendations,
      timestamp: Date.now(),
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
}

export const uiComponentRecommender = new UIComponentRecommender();

export default uiComponentRecommender;
