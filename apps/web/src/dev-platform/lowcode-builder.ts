import { designTokens, semanticTokens } from '@topems/tokens';
/**
 * V53.0 微前端平台终局 — 低代码搭建引擎
 *
 * 从 V47.0 LowCodeBuilder 演进而来，提供:
 * - 拖拽组件画布（虚拟画布 + 组件布局 + 对齐辅助线）
 * - 属性面板配置（组件属性可视化编辑 + 校验）
 * - 数据绑定配置（REST/GraphQL/WebSocket 数据源绑定）
 * - 业务流程编排（节点式流程设计 + 触发器 + 动作）
 * - 主题与样式定制（设计令牌 + 主题预设 + CSS 变量）
 * - 预览与发布（实时预览 + 版本发布 + 回滚）
 * - 模板管理（模板创建 + 版本化 + 分类浏览）
 *
 * @example
 * import { lowCodeBuilder } from '@/dev-platform';
 *
 * const canvas = lowCodeBuilder.createCanvas('my-page');
 * lowCodeBuilder.addComponent(canvas.id, { type: 'Button', x: 100, y: 200 });
 * lowCodeBuilder.bindData(canvas.id, 'btn-1', { sourceType: 'rest', endpoint: '/api/data' });
 * const preview = lowCodeBuilder.preview(canvas.id);
 */

export type ComponentType =
  | 'container'
  | 'text'
  | 'heading'
  | 'button'
  | 'input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'datepicker'
  | 'table'
  | 'card'
  | 'tabs'
  | 'form'
  | 'dialog'
  | 'alert'
  | 'chart'
  | 'image'
  | 'video'
  | 'icon'
  | 'breadcrumb'
  | 'menu'
  | 'divider'
  | 'spacer'
  | 'custom';

export type DataSourceType = 'rest' | 'graphql' | 'websocket' | 'static' | 'database';
export type FlowNodeType = 'trigger' | 'action' | 'condition' | 'loop' | 'transform' | 'output';
export type FlowEdgeType = 'default' | 'true' | 'false' | 'error';
export type CanvasStatus = 'draft' | 'preview' | 'published' | 'archived';
export type PublishStatus = 'idle' | 'publishing' | 'success' | 'failed';

export interface CanvasComponent {
  id: string;
  type: ComponentType;
  name: string;
  props: Record<string, unknown>;
  position: { x: number; y: number; width: number; height: number };
  dataBinding?: DataBindingConfig;
  children: CanvasComponent[];
  style: Record<string, string | number>;
  visibility: {
    hidden: boolean;
    locked: boolean;
    conditional?: string;
  };
  animations?: AnimationConfig[];
}

export interface DataBindingConfig {
  id: string;
  sourceType: DataSourceType;
  endpoint: string;
  query?: string;
  variables?: Record<string, unknown>;
  transform?: string;
  pollingInterval?: number;
  autoLoad: boolean;
  defaultValue?: unknown;
}

export interface AnimationConfig {
  trigger: 'mount' | 'hover' | 'click' | 'scroll';
  animation: string;
  duration: number;
  delay: number;
  easing: string;
}

export interface CanvasPage {
  id: string;
  name: string;
  description: string;
  components: CanvasComponent[];
  theme: ThemeConfig;
  dataSources: DataSourceConfig[];
  status: CanvasStatus;
  version: string;
  created_at: number;
  updated_at: number;
  publishedAt?: number;
  createdBy: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  borderRadius: string;
  shadows: string[];
  mode: 'light' | 'dark' | 'system';
  customTokens?: Record<string, string>;
}

export interface ColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface TypographyTokens {
  fontFamily: string;
  h1: { size: string; weight: number; lineHeight: string };
  h2: { size: string; weight: number; lineHeight: string };
  h3: { size: string; weight: number; lineHeight: string };
  body: { size: string; weight: number; lineHeight: string };
  caption: { size: string; weight: number; lineHeight: string };
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;
  endpoint: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  cacheEnabled: boolean;
  cacheTtl: number;
  transformScript?: string;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  triggers: FlowTrigger[];
  actions: FlowAction[];
  variables: Record<string, unknown>;
  status: 'draft' | 'active' | 'paused' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: FlowEdgeType;
  label?: string;
  condition?: string;
}

export interface FlowTrigger {
  id: string;
  type: 'event' | 'schedule' | 'webhook' | 'manual';
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface FlowAction {
  id: string;
  type: 'api-call' | 'navigate' | 'show-message' | 'update-state' | 'emit-event' | 'custom';
  config: Record<string, unknown>;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  preview: string;
  components: CanvasComponent[];
  theme: ThemeConfig;
  dataSources: DataSourceConfig[];
  flows: FlowDefinition[];
  tags: string[];
  author: string;
  version: string;
  popularity: number;
  created_at: number;
  updated_at: number;
}

export interface PublishRecord {
  id: string;
  pageId: string;
  version: string;
  status: PublishStatus;
  publishedAt: number;
  publishedBy: string;
  artifacts: string[];
  url: string;
  error?: string;
}

export type BuilderChangeListener = (pages: CanvasPage[]) => void;

const DEFAULT_THEME: ThemeConfig = {
  id: 'default-light',
  name: '默认浅色主题',
  colors: {
    primary: designTokens.colors.primary.dark,
    secondary: '#9c27b0',
    accent: '#ff9800',
    background: 'primary.contrastText',
    surface: '#f5f5f5',
    text: '#212121',
    textSecondary: '#757575',
    border: '#e0e0e0',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { size: '2.5rem', weight: 700, lineHeight: '1.2' },
    h2: { size: '2rem', weight: 600, lineHeight: '1.3' },
    h3: { size: '1.5rem', weight: 600, lineHeight: '1.4' },
    body: { size: '1rem', weight: 400, lineHeight: '1.5' },
    caption: { size: '0.875rem', weight: 400, lineHeight: '1.43' },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  borderRadius: 'md',
  shadows: ['none', '0 1px 3px rgba(0,0,0,0.12)', '0 4px 12px rgba(0,0,0,0.15)'],
  mode: 'light',
};

const DARK_THEME: ThemeConfig = {
  ...DEFAULT_THEME,
  id: 'default-dark',
  name: '默认深色主题',
  colors: {
    ...DEFAULT_THEME.colors,
    background: 'grey.950',
    surface: '#1e1e1e',
    text: '#e0e0e0',
    textSecondary: '#9e9e9e',
    border: '#424242',
  },
  mode: 'dark',
};

const PRESET_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'tpl-dashboard',
    name: '数据仪表盘',
    description: '带图表和指标卡的数据可视化仪表盘模板',
    category: 'dashboard',
    preview: 'dashboard-preview',
    components: [
      {
        id: 'root',
        type: 'container',
        name: '根容器',
        props: { direction: 'column', gap: 16 },
        position: { x: 0, y: 0, width: 1200, height: 800 },
        children: [],
        style: { padding: 6 },
        visibility: { hidden: false, locked: false },
      },
    ],
    theme: DEFAULT_THEME,
    dataSources: [],
    flows: [],
    tags: ['仪表盘', '数据', '图表'],
    author: 'TOPEMS Team',
    version: '1.0.0',
    popularity: 9500,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: 'tpl-form',
    name: '业务表单',
    description: '完整的数据录入表单，带校验和提交流程',
    category: 'form',
    preview: 'form-preview',
    components: [],
    theme: DEFAULT_THEME,
    dataSources: [],
    flows: [],
    tags: ['表单', '校验', 'CRUD'],
    author: 'TOPEMS Team',
    version: '1.0.0',
    popularity: 8700,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: 'tpl-list-detail',
    name: '列表详情页',
    description: '主从布局的列表 + 详情页模板',
    category: 'crud',
    preview: 'list-detail-preview',
    components: [],
    theme: DEFAULT_THEME,
    dataSources: [],
    flows: [],
    tags: ['列表', '详情', '管理'],
    author: 'TOPEMS Team',
    version: '1.0.0',
    popularity: 7200,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
];

export class LowCodeBuilder {
  private pages: Map<string, CanvasPage> = new Map();
  private flows: Map<string, FlowDefinition> = new Map();
  private templates: Map<string, TemplateDefinition> = new Map();
  private publishRecords: Map<string, PublishRecord[]> = new Map();
  private selectedComponentId: Map<string, string> = new Map();
  private listeners: Set<BuilderChangeListener> = new Set();

  constructor() {
    this.initPresetTemplates();
  }

  private initPresetTemplates(): void {
    PRESET_TEMPLATES.forEach((tpl) => {
      this.templates.set(tpl.id, { ...tpl });
    });
  }

  // ==================== 画布（页面）管理 ====================

  createPage(name: string, description?: string): CanvasPage {
    const pageId = `page_v53_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const page: CanvasPage = {
      id: pageId,
      name,
      description: description || `${name} - V53 低代码页面`,
      components: [],
      theme: { ...DEFAULT_THEME },
      dataSources: [],
      status: 'draft',
      version: '1.0.0',
      created_at: Date.now(),
      updated_at: Date.now(),
      createdBy: 'current-user',
    };
    this.pages.set(pageId, page);
    this.notifyListeners();
    return page;
  }

  getPage(pageId: string): CanvasPage | undefined {
    return this.pages.get(pageId);
  }

  listPages(): CanvasPage[] {
    return Array.from(this.pages.values()).sort((a, b) => b.updated_at - a.updated_at);
  }

  deletePage(pageId: string): boolean {
    const deleted = this.pages.delete(pageId);
    if (deleted) {
      this.publishRecords.delete(pageId);
      this.selectedComponentId.delete(pageId);
      this.notifyListeners();
    }
    return deleted;
  }

  duplicatePage(pageId: string, newName: string): CanvasPage | null {
    const page = this.pages.get(pageId);
    if (!page) return null;
    const cloned = this.clonePage(page);
    cloned.id = `page_v53_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    cloned.name = newName;
    cloned.status = 'draft';
    cloned.created_at = Date.now();
    cloned.updated_at = Date.now();
    this.pages.set(cloned.id, cloned);
    this.notifyListeners();
    return cloned;
  }

  private clonePage(page: CanvasPage): CanvasPage {
    return JSON.parse(JSON.stringify(page)) as CanvasPage;
  }

  // ==================== 组件画布操作 ====================

  addComponent(
    pageId: string,
    options: {
      type: ComponentType;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      props?: Record<string, unknown>;
      parentId?: string;
    }
  ): CanvasComponent | null {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const component: CanvasComponent = {
      id: `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: options.type,
      name: this.getDefaultName(options.type),
      props: options.props || this.getDefaultProps(options.type),
      position: {
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: options.width ?? this.getDefaultWidth(options.type),
        height: options.height ?? this.getDefaultHeight(options.type),
      },
      children: [],
      style: {},
      visibility: { hidden: false, locked: false },
    };

    if (options.parentId) {
      const parent = this.findComponent(page.components, options.parentId);
      if (parent) {
        parent.children.push(component);
      } else {
        page.components.push(component);
      }
    } else {
      page.components.push(component);
    }

    page.updated_at = Date.now();
    this.notifyListeners();
    return component;
  }

  removeComponent(pageId: string, componentId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;

    const removed = this.removeComponentRecursive(page.components, componentId);
    if (removed) {
      page.updated_at = Date.now();
      this.notifyListeners();
    }
    return removed;
  }

  private removeComponentRecursive(components: CanvasComponent[], id: string): boolean {
    const idx = components.findIndex((c) => c.id === id);
    if (idx >= 0) {
      components.splice(idx, 1);
      return true;
    }
    for (const comp of components) {
      if (this.removeComponentRecursive(comp.children, id)) return true;
    }
    return false;
  }

  updateComponent(pageId: string, componentId: string, updates: Partial<CanvasComponent>): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const component = this.findComponent(page.components, componentId);
    if (!component) return false;

    Object.assign(component, updates);
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  moveComponent(pageId: string, componentId: string, position: { x: number; y: number }): boolean {
    return this.updateComponent(pageId, componentId, { position } as Partial<CanvasComponent>);
  }

  resizeComponent(
    pageId: string,
    componentId: string,
    size: { width: number; height: number }
  ): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const component = this.findComponent(page.components, componentId);
    if (!component) return false;

    component.position = { ...component.position, ...size };
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  getComponent(pageId: string, componentId: string): CanvasComponent | undefined {
    const page = this.pages.get(pageId);
    if (!page) return undefined;
    return this.findComponent(page.components, componentId);
  }

  private findComponent(components: CanvasComponent[], id: string): CanvasComponent | undefined {
    for (const comp of components) {
      if (comp.id === id) return comp;
      const found = this.findComponent(comp.children, id);
      if (found) return found;
    }
    return undefined;
  }

  selectComponent(pageId: string, componentId: string | null): void {
    if (componentId) {
      this.selectedComponentId.set(pageId, componentId);
    } else {
      this.selectedComponentId.delete(pageId);
    }
  }

  getSelectedComponent(pageId: string): CanvasComponent | undefined {
    const selectedId = this.selectedComponentId.get(pageId);
    if (!selectedId) return undefined;
    return this.getComponent(pageId, selectedId);
  }

  // ==================== 属性面板 ====================

  updateComponentProps(
    pageId: string,
    componentId: string,
    props: Record<string, unknown>
  ): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const component = this.findComponent(page.components, componentId);
    if (!component) return false;

    component.props = { ...component.props, ...props };
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  updateComponentStyle(
    pageId: string,
    componentId: string,
    style: Record<string, string | number>
  ): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const component = this.findComponent(page.components, componentId);
    if (!component) return false;

    component.style = { ...component.style, ...style };
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  toggleComponentLock(pageId: string, componentId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const component = this.findComponent(page.components, componentId);
    if (!component) return false;

    component.visibility.locked = !component.visibility.locked;
    this.notifyListeners();
    return true;
  }

  toggleComponentVisibility(pageId: string, componentId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const component = this.findComponent(page.components, componentId);
    if (!component) return false;

    component.visibility.hidden = !component.visibility.hidden;
    this.notifyListeners();
    return true;
  }

  // ==================== 数据绑定配置 ====================

  addDataSource(pageId: string, config: DataSourceConfig): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    if (page.dataSources.some((s) => s.id === config.id)) return false;
    page.dataSources.push(config);
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  removeDataSource(pageId: string, dataSourceId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const before = page.dataSources.length;
    page.dataSources = page.dataSources.filter((s) => s.id !== dataSourceId);
    if (page.dataSources.length !== before) {
      page.updated_at = Date.now();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  bindData(pageId: string, componentId: string, binding: Omit<DataBindingConfig, 'id'>): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const component = this.findComponent(page.components, componentId);
    if (!component) return false;

    const bindingWithId: DataBindingConfig = {
      id: `binding_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...binding,
    };

    component.dataBinding = bindingWithId;
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  unbindData(pageId: string, componentId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const component = this.findComponent(page.components, componentId);
    if (!component || !component.dataBinding) return false;

    component.dataBinding = undefined;
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  // ==================== 业务流程编排 ====================

  createFlow(name: string, description?: string): FlowDefinition {
    const flowId = `flow_v53_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const flow: FlowDefinition = {
      id: flowId,
      name,
      description: description || `${name} - V53 业务流程`,
      nodes: [],
      edges: [],
      triggers: [],
      actions: [],
      variables: {},
      status: 'draft',
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    this.flows.set(flowId, flow);
    return flow;
  }

  getFlow(flowId: string): FlowDefinition | undefined {
    return this.flows.get(flowId);
  }

  listFlows(): FlowDefinition[] {
    return Array.from(this.flows.values()).sort((a, b) => b.updated_at - a.updated_at);
  }

  addFlowNode(flowId: string, node: Omit<FlowNode, 'id'>): FlowNode | null {
    const flow = this.flows.get(flowId);
    if (!flow) return null;

    const newNode: FlowNode = {
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    flow.nodes.push(newNode);
    flow.updated_at = Date.now();
    return newNode;
  }

  addFlowEdge(
    flowId: string,
    source: string,
    target: string,
    type: FlowEdgeType = 'default'
  ): FlowEdge | null {
    const flow = this.flows.get(flowId);
    if (!flow) return null;

    const edge: FlowEdge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source,
      target,
      type,
    };
    flow.edges.push(edge);
    flow.updated_at = Date.now();
    return edge;
  }

  removeFlowNode(flowId: string, nodeId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;

    const before = flow.nodes.length;
    flow.nodes = flow.nodes.filter((n) => n.id !== nodeId);
    flow.edges = flow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    flow.triggers = flow.triggers.filter((t) => t.id !== nodeId);
    flow.actions = flow.actions.filter((a) => a.id !== nodeId);
    flow.updated_at = Date.now();
    return flow.nodes.length !== before;
  }

  validateFlow(flowId: string): { valid: boolean; issues: string[] } {
    const flow = this.flows.get(flowId);
    if (!flow) return { valid: false, issues: ['Flow not found'] };

    const issues: string[] = [];

    const hasTrigger = flow.triggers.length > 0 || flow.nodes.some((n) => n.type === 'trigger');
    if (!hasTrigger) {
      issues.push('流程必须至少包含一个触发器');
    }

    const orphanNodes = flow.nodes.filter(
      (n) => n.type !== 'trigger' && !flow.edges.some((e) => e.target === n.id)
    );
    if (orphanNodes.length > 0) {
      issues.push(`存在 ${orphanNodes.length} 个孤立节点`);
    }

    return { valid: issues.length === 0, issues };
  }

  // ==================== 主题与样式 ====================

  getDefaultTheme(): ThemeConfig {
    return { ...DEFAULT_THEME };
  }

  getDarkTheme(): ThemeConfig {
    return { ...DARK_THEME };
  }

  listThemePresets(): Array<{ id: string; name: string; mode: string; theme: ThemeConfig }> {
    return [
      { id: 'light', name: '浅色主题', mode: 'light', theme: { ...DEFAULT_THEME } },
      { id: 'dark', name: '深色主题', mode: 'dark', theme: { ...DARK_THEME } },
    ];
  }

  applyTheme(pageId: string, theme: ThemeConfig): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    page.theme = { ...theme };
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  updateThemeTokens(pageId: string, tokenPath: string, value: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;

    const keys = tokenPath.split('.');
    let obj: Record<string, unknown> = page.theme as unknown as Record<string, unknown>;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]] as Record<string, unknown>;
    }
    obj[keys[keys.length - 1]] = value;

    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  // ==================== 预览与发布 ====================

  preview(pageId: string): { url: string; schema: CanvasPage } | null {
    const page = this.pages.get(pageId);
    if (!page) return null;
    page.status = 'preview';
    return {
      url: `about:blank#v53-preview:${pageId}`,
      schema: this.clonePage(page),
    };
  }

  publish(pageId: string, message?: string): PublishRecord | null {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const recordId = `pub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: PublishRecord = {
      id: recordId,
      pageId,
      version: page.version,
      status: 'publishing',
      publishedAt: Date.now(),
      publishedBy: page.createdBy,
      artifacts: [`${page.name}.html`, `${page.name}.js`, `${page.name}.css`],
      url: `https://v53-preview.dev/${pageId}`,
    };

    if (!this.publishRecords.has(pageId)) {
      this.publishRecords.set(pageId, []);
    }

    setTimeout(
      () => {
        const latest = this.publishRecords.get(pageId);
        if (!latest) return;
        const idx = latest.findIndex((r) => r.id === recordId);
        if (idx === -1) return;

        latest[idx].status = 'success';
        page.status = 'published';
        page.publishedAt = Date.now();
        page.version = this.incrementVersion(page.version);
        page.updated_at = Date.now();
        this.notifyListeners();
      },
      300 + Math.random() * 200
    );

    this.publishRecords.get(pageId)!.push(record);
    this.notifyListeners();
    return record;
  }

  getPublishHistory(pageId: string): PublishRecord[] {
    return this.publishRecords.get(pageId) || [];
  }

  rollback(pageId: string, version: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    page.version = version;
    page.status = 'draft';
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  // ==================== 模板管理 ====================

  listTemplates(category?: string): TemplateDefinition[] {
    const all = Array.from(this.templates.values());
    if (category) {
      return all.filter((t) => t.category === category);
    }
    return all.sort((a, b) => b.popularity - a.popularity);
  }

  getTemplate(templateId: string): TemplateDefinition | undefined {
    return this.templates.get(templateId);
  }

  createTemplate(
    definition: Omit<TemplateDefinition, 'id' | 'created_at' | 'updated_at'>
  ): TemplateDefinition {
    const id = `tpl_v53_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const template: TemplateDefinition = {
      ...definition,
      id,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    this.templates.set(id, template);
    return template;
  }

  applyTemplate(templateId: string, pageId: string): boolean {
    const template = this.templates.get(templateId);
    const page = this.pages.get(pageId);
    if (!template || !page) return false;

    page.components = this.cloneComponents(template.components);
    page.theme = { ...template.theme };
    page.dataSources = [...template.dataSources];
    page.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  private cloneComponents(components: CanvasComponent[]): CanvasComponent[] {
    return JSON.parse(JSON.stringify(components)) as CanvasComponent[];
  }

  // ==================== 辅助方法 ====================

  private getDefaultName(type: ComponentType): string {
    const names: Partial<Record<ComponentType, string>> = {
      container: '容器',
      text: '文本',
      heading: '标题',
      button: '按钮',
      input: '输入框',
      textarea: '文本域',
      select: '下拉选择',
      checkbox: '复选框',
      radio: '单选框',
      datepicker: '日期选择',
      table: '表格',
      card: '卡片',
      tabs: '标签页',
      form: '表单',
      dialog: '对话框',
      alert: '警告提示',
      chart: '图表',
      image: '图片',
      video: '视频',
      icon: '图标',
      breadcrumb: '面包屑',
      menu: '菜单',
      divider: '分割线',
      spacer: '空白',
      custom: '自定义',
    };
    return names[type] || '组件';
  }

  private getDefaultProps(type: ComponentType): Record<string, unknown> {
    const defaults: Partial<Record<ComponentType, Record<string, unknown>>> = {
      button: { label: '按钮', variant: 'primary', size: 'medium' },
      input: { placeholder: '请输入...', type: 'text' },
      text: { content: '文本内容', align: 'left' },
      heading: { content: '标题', level: 'h2' },
      container: { direction: 'column', gap: 16 },
      card: { title: '卡片标题', bordered: true },
      table: { columns: [], dataSource: [], pagination: true },
      form: { layout: 'horizontal', labelWidth: 100 },
      dialog: { title: '对话框', visible: false, width: 520 },
    };
    return defaults[type] || {};
  }

  private getDefaultWidth(type: ComponentType): number {
    const widths: Partial<Record<ComponentType, number>> = {
      container: 400,
      button: 120,
      input: 200,
      text: 200,
      heading: 300,
      card: 320,
      table: 600,
      form: 400,
      chart: 500,
    };
    return widths[type] || 200;
  }

  private getDefaultHeight(type: ComponentType): number {
    const heights: Partial<Record<ComponentType, number>> = {
      container: 200,
      button: 36,
      input: 32,
      text: 24,
      heading: 40,
      card: 160,
      table: 300,
      form: 200,
      chart: 300,
    };
    return heights[type] || 40;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    parts[parts.length - 1] = String(parseInt(parts[parts.length - 1], 10) + 1);
    return parts.join('.');
  }

  // ==================== 订阅 ====================

  subscribe(listener: BuilderChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const pages = this.listPages();
    this.listeners.forEach((cb) => {
      try {
        cb(pages);
      } catch {
        // ignore
      }
    });
  }
}

export const lowCodeBuilder = new LowCodeBuilder();
export default lowCodeBuilder;
