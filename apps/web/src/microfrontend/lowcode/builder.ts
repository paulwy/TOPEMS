import { designTokens, semanticTokens } from '@topems/tokens';
/**
 * V47.0 微前端平台终局 — 低代码搭建引擎
 *
 * 可视化页面搭建引擎，支持:
 * - 组件拖拽布局（基于组件树的页面结构管理）
 * - 属性面板配置（组件属性可视化编辑）
 * - 样式编辑器（CSS 可视化编辑）
 * - 事件绑定（交互逻辑可视化配置）
 * - 数据源绑定（API/GraphQL/静态数据绑定）
 * - 响应式设计支持
 *
 * @example
 * import { lowCodeBuilder, LowCodeBuilder } from '@/microfrontend/lowcode';
 *
 * const page = lowCodeBuilder.createPage('my-page', '首页');
 * lowCodeBuilder.addComponent(page.page_id, {
 *   type: 'Button',
 *   props: { text: '点击我' },
 * });
 * const code = lowCodeBuilder.exportCode(page.page_id);
 */

export enum ComponentCategory {
  LAYOUT = 'layout',
  FORM = 'form',
  DISPLAY = 'display',
  NAVIGATION = 'navigation',
  FEEDBACK = 'feedback',
  CHART = 'chart',
  MEDIA = 'media',
  UTILITY = 'utility',
}

export enum ActionType {
  NAVIGATE = 'navigate',
  CALLAPI = 'call-api',
  SHOWMESSAGE = 'show-message',
  UPDATESTATE = 'update-state',
  OPENDIALOG = 'open-dialog',
  CLOSEDIALOG = 'close-dialog',
  CUSTOM = 'custom',
}

export type DataSourceType = 'rest-api' | 'graphql' | 'static' | 'websocket' | 'database';

export interface ComponentNode {
  id: string;
  type: string;
  name?: string;
  props: Record<string, unknown>;
  children: ComponentNode[];
  style: Record<string, string | number>;
  events: EventBinding[];
  data_binding?: DataSourceBinding;
  responsive?: ResponsiveStyle;
  locked?: boolean;
  hidden?: boolean;
}

export interface ResponsiveStyle {
  mobile?: Record<string, string>;
  tablet?: Record<string, string>;
  desktop?: Record<string, string>;
}

export interface EventBinding {
  event_name: string;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  condition?: string;
}

export interface DataSourceBinding {
  source_id: string;
  source_type: DataSourceType;
  endpoint: string;
  query?: string;
  variables?: Record<string, unknown>;
  transform?: string;
  polling_interval?: number;
}

export interface PageSchema {
  page_id: string;
  name: string;
  description?: string;
  components: ComponentNode[];
  styles: Record<string, string>;
  data_sources: DataSourceConfig[];
  events: EventBinding[];
  metadata: PageMetadata;
}

export interface DataSourceConfig {
  source_id: string;
  name: string;
  source_type: DataSourceType;
  endpoint: string;
  headers?: Record<string, string>;
  default_query?: string;
  cache_enabled?: boolean;
  cache_ttl_seconds?: number;
}

export interface PageMetadata {
  title: string;
  description: string;
  created_at: number;
  updated_at: number;
  author: string;
  version: string;
  responsive: boolean;
  theme?: string;
}

export interface BuilderConfig {
  grid_size: number;
  snap_to_grid: boolean;
  show_guides: boolean;
  responsive_breakpoints: ResponsiveBreakpoint[];
}

export interface ResponsiveBreakpoint {
  name: string;
  label: string;
  min_width: number;
  max_width?: number;
  icon: string;
}

export interface ComponentDefinition {
  type: string;
  name: string;
  category: ComponentCategory;
  icon: string;
  default_props: Record<string, unknown>;
  default_style: Record<string, string | number>;
  prop_schema: PropSchema[];
  is_container: boolean;
  description: string;
}

export interface PropSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'textarea' | 'object';
  default?: unknown;
  options?: { label: string; value: string }[];
  group?: string;
  description?: string;
}

export interface ExportCodeResult {
  page_id: string;
  framework: string;
  files: ExportedFile[];
  dependencies: string[];
}

export interface ExportedFile {
  path: string;
  content: string;
  language: string;
}

const DEFAULT_BREAKPOINTS: ResponsiveBreakpoint[] = [
  { name: 'mobile', label: '移动端', min_width: 0, max_width: 768, icon: 'smartphone' },
  { name: 'tablet', label: '平板', min_width: 768, max_width: 1024, icon: 'tablet' },
  { name: 'desktop', label: '桌面端', min_width: 1024, icon: 'monitor' },
];

const PRESET_COMPONENTS: ComponentDefinition[] = [
  {
    type: 'Container',
    name: '容器',
    category: ComponentCategory.LAYOUT,
    icon: 'square',
    default_props: {},
    default_style: { display: 'flex', flexDirection: 'column', padding: 4, gap: 3 },
    prop_schema: [
      {
        key: 'direction',
        label: '排列方向',
        type: 'select',
        default: 'column',
        options: [
          { label: '纵向', value: 'column' },
          { label: '横向', value: 'row' },
        ],
        group: '布局',
      },
      { key: 'gap', label: '间距', type: 'string', default: '12px', group: '布局' },
      { key: 'padding', label: '内边距', type: 'string', default: '16px', group: '布局' },
    ],
    is_container: true,
    description: '通用布局容器，支持弹性布局与嵌套',
  },
  {
    type: 'Row',
    name: '行布局',
    category: ComponentCategory.LAYOUT,
    icon: 'rows-three',
    default_props: { gutter: 16 },
    default_style: { display: 'flex', flexDirection: 'row' },
    prop_schema: [
      { key: 'gutter', label: '列间距', type: 'number', default: 16, group: '布局' },
      {
        key: 'align',
        label: '垂直对齐',
        type: 'select',
        options: [
          { label: '顶部', value: 'flex-start' },
          { label: '居中', value: 'center' },
          { label: '底部', value: 'flex-end' },
        ],
        group: '布局',
      },
    ],
    is_container: true,
    description: '水平排列的行容器',
  },
  {
    type: 'Column',
    name: '列布局',
    category: ComponentCategory.LAYOUT,
    icon: 'columns-three',
    default_props: { span: 12 },
    default_style: { flex: '1' },
    prop_schema: [
      { key: 'span', label: '占比', type: 'number', default: 12, group: '布局' },
      { key: 'offset', label: '偏移', type: 'number', default: 0, group: '布局' },
    ],
    is_container: true,
    description: '栅格列容器',
  },
  {
    type: 'Grid',
    name: '栅格布局',
    category: ComponentCategory.LAYOUT,
    icon: 'layout-grid',
    default_props: { columns: 3, gap: 16 },
    default_style: { display: 'grid' },
    prop_schema: [
      { key: 'columns', label: '列数', type: 'number', default: 3, group: '布局' },
      { key: 'gap', label: '间距', type: 'string', default: '16px', group: '布局' },
    ],
    is_container: true,
    description: 'CSS Grid 栅格布局容器',
  },
  {
    type: 'Card',
    name: '卡片',
    category: ComponentCategory.DISPLAY,
    icon: 'rectangle-horizontal',
    default_props: { title: '卡片标题', bordered: true },
    default_style: {
      background: 'common.white',
      borderRadius: 'md',
      padding: 4,
      boxShadow: designTokens.shadows.sm,
    },
    prop_schema: [
      { key: 'title', label: '标题', type: 'string', default: '卡片标题', group: '内容' },
      { key: 'bordered', label: '显示边框', type: 'boolean', default: true, group: '样式' },
      {
        key: 'shadow',
        label: '阴影',
        type: 'select',
        options: [
          { label: '无', value: 'none' },
          { label: '浅', value: 'sm' },
          { label: '中', value: 'md' },
          { label: '深', value: 'lg' },
        ],
        group: '样式',
      },
    ],
    is_container: true,
    description: '内容卡片容器，支持标题与内容区',
  },
  {
    type: 'Button',
    name: '按钮',
    category: ComponentCategory.FORM,
    icon: 'mouse-pointer-click',
    default_props: { text: '按钮', type: 'primary', size: 'medium' },
    default_style: {},
    prop_schema: [
      { key: 'text', label: '文本', type: 'string', default: '按钮', group: '内容' },
      {
        key: 'type',
        label: '类型',
        type: 'select',
        default: 'primary',
        options: [
          { label: '主要', value: 'primary' },
          { label: '次要', value: 'default' },
          { label: '危险', value: 'danger' },
          { label: '链接', value: 'link' },
        ],
        group: '样式',
      },
      {
        key: 'size',
        label: '尺寸',
        type: 'select',
        default: 'medium',
        options: [
          { label: '小', value: 'small' },
          { label: '中', value: 'medium' },
          { label: '大', value: 'large' },
        ],
        group: '样式',
      },
      { key: 'disabled', label: '禁用', type: 'boolean', default: false, group: '状态' },
      { key: 'loading', label: '加载中', type: 'boolean', default: false, group: '状态' },
    ],
    is_container: false,
    description: '可点击的按钮组件，支持多种类型与状态',
  },
  {
    type: 'Input',
    name: '输入框',
    category: ComponentCategory.FORM,
    icon: 'text-cursor-input',
    default_props: { placeholder: '请输入', value: '' },
    default_style: { width: '100%' },
    prop_schema: [
      { key: 'placeholder', label: '占位文本', type: 'string', default: '请输入', group: '内容' },
      { key: 'value', label: '默认值', type: 'string', group: '内容' },
      {
        key: 'type',
        label: '类型',
        type: 'select',
        default: 'text',
        options: [
          { label: '文本', value: 'text' },
          { label: '密码', value: 'password' },
          { label: '数字', value: 'number' },
          { label: '邮箱', value: 'email' },
        ],
        group: '样式',
      },
      { key: 'disabled', label: '禁用', type: 'boolean', default: false, group: '状态' },
      { key: 'readonly', label: '只读', type: 'boolean', default: false, group: '状态' },
    ],
    is_container: false,
    description: '文本输入框，支持多种输入类型',
  },
  {
    type: 'Textarea',
    name: '文本域',
    category: ComponentCategory.FORM,
    icon: 'text',
    default_props: { placeholder: '请输入内容', rows: 4 },
    default_style: { width: '100%' },
    prop_schema: [
      {
        key: 'placeholder',
        label: '占位文本',
        type: 'string',
        default: '请输入内容',
        group: '内容',
      },
      { key: 'rows', label: '行数', type: 'number', default: 4, group: '样式' },
      { key: 'maxLength', label: '最大字数', type: 'number', group: '校验' },
    ],
    is_container: false,
    description: '多行文本输入框',
  },
  {
    type: 'Select',
    name: '下拉选择',
    category: ComponentCategory.FORM,
    icon: 'chevron-down-square',
    default_props: { placeholder: '请选择', options: [] },
    default_style: { width: '100%' },
    prop_schema: [
      { key: 'placeholder', label: '占位文本', type: 'string', default: '请选择', group: '内容' },
      { key: 'options', label: '选项', type: 'object', group: '内容' },
      { key: 'multiple', label: '多选', type: 'boolean', default: false, group: '样式' },
    ],
    is_container: false,
    description: '下拉选择器，支持单选/多选',
  },
  {
    type: 'Checkbox',
    name: '复选框',
    category: ComponentCategory.FORM,
    icon: 'check-square',
    default_props: { label: '选项', checked: false },
    default_style: {},
    prop_schema: [
      { key: 'label', label: '标签', type: 'string', default: '选项', group: '内容' },
      { key: 'checked', label: '选中', type: 'boolean', default: false, group: '状态' },
      { key: 'disabled', label: '禁用', type: 'boolean', default: false, group: '状态' },
    ],
    is_container: false,
    description: '复选框组件',
  },
  {
    type: 'Radio',
    name: '单选框',
    category: ComponentCategory.FORM,
    icon: 'circle',
    default_props: { label: '选项', options: [] },
    default_style: {},
    prop_schema: [
      { key: 'label', label: '标签', type: 'string', default: '选项', group: '内容' },
      { key: 'options', label: '选项列表', type: 'object', group: '内容' },
    ],
    is_container: false,
    description: '单选框组',
  },
  {
    type: 'DatePicker',
    name: '日期选择',
    category: ComponentCategory.FORM,
    icon: 'calendar',
    default_props: { placeholder: '请选择日期' },
    default_style: { width: '100%' },
    prop_schema: [
      {
        key: 'placeholder',
        label: '占位文本',
        type: 'string',
        default: '请选择日期',
        group: '内容',
      },
      { key: 'format', label: '格式', type: 'string', default: 'YYYY-MM-DD', group: '样式' },
      { key: 'showTime', label: '显示时间', type: 'boolean', default: false, group: '样式' },
    ],
    is_container: false,
    description: '日期选择器',
  },
  {
    type: 'Form',
    name: '表单容器',
    category: ComponentCategory.FORM,
    icon: 'form-input',
    default_props: { labelWidth: 100, layout: 'horizontal' },
    default_style: {},
    prop_schema: [
      { key: 'labelWidth', label: '标签宽度', type: 'number', default: 100, group: '布局' },
      {
        key: 'layout',
        label: '布局',
        type: 'select',
        default: 'horizontal',
        options: [
          { label: '水平', value: 'horizontal' },
          { label: '垂直', value: 'vertical' },
          { label: '行内', value: 'inline' },
        ],
        group: '布局',
      },
    ],
    is_container: true,
    description: '表单容器，统一管理表单项',
  },
  {
    type: 'Table',
    name: '表格',
    category: ComponentCategory.DISPLAY,
    icon: 'table',
    default_props: { columns: [], dataSource: [], pagination: true },
    default_style: { width: '100%' },
    prop_schema: [
      { key: 'columns', label: '列配置', type: 'object', group: '内容' },
      { key: 'dataSource', label: '数据源', type: 'object', group: '内容' },
      { key: 'pagination', label: '分页', type: 'boolean', default: true, group: '功能' },
      { key: 'bordered', label: '边框', type: 'boolean', default: true, group: '样式' },
      { key: 'rowSelection', label: '行选择', type: 'boolean', default: false, group: '功能' },
    ],
    is_container: false,
    description: '数据表格，支持分页/排序/选择',
  },
  {
    type: 'Tabs',
    name: '标签页',
    category: ComponentCategory.NAVIGATION,
    icon: 'tabs',
    default_props: { tabs: [], activeKey: '' },
    default_style: {},
    prop_schema: [
      { key: 'tabs', label: '标签页', type: 'object', group: '内容' },
      { key: 'activeKey', label: '当前激活', type: 'string', group: '状态' },
      {
        key: 'type',
        label: '样式',
        type: 'select',
        default: 'line',
        options: [
          { label: '线条', value: 'line' },
          { label: '卡片', value: 'card' },
        ],
        group: '样式',
      },
    ],
    is_container: true,
    description: '标签页切换组件',
  },
  {
    type: 'Menu',
    name: '导航菜单',
    category: ComponentCategory.NAVIGATION,
    icon: 'menu',
    default_props: { items: [], mode: 'horizontal' },
    default_style: {},
    prop_schema: [
      { key: 'items', label: '菜单项', type: 'object', group: '内容' },
      {
        key: 'mode',
        label: '模式',
        type: 'select',
        default: 'horizontal',
        options: [
          { label: '水平', value: 'horizontal' },
          { label: '垂直', value: 'vertical' },
          { label: '内联', value: 'inline' },
        ],
        group: '样式',
      },
    ],
    is_container: false,
    description: '导航菜单组件',
  },
  {
    type: 'Breadcrumb',
    name: '面包屑',
    category: ComponentCategory.NAVIGATION,
    icon: 'route',
    default_props: { items: [] },
    default_style: {},
    prop_schema: [
      { key: 'items', label: '面包屑项', type: 'object', group: '内容' },
      { key: 'separator', label: '分隔符', type: 'string', default: '/', group: '样式' },
    ],
    is_container: false,
    description: '面包屑导航',
  },
  {
    type: 'Dialog',
    name: '对话框',
    category: ComponentCategory.FEEDBACK,
    icon: 'panel-top',
    default_props: { title: '对话框', visible: false, width: 520 },
    default_style: {},
    prop_schema: [
      { key: 'title', label: '标题', type: 'string', default: '对话框', group: '内容' },
      { key: 'visible', label: '是否显示', type: 'boolean', default: false, group: '状态' },
      { key: 'width', label: '宽度', type: 'number', default: 520, group: '样式' },
      { key: 'maskClosable', label: '点击遮罩关闭', type: 'boolean', default: true, group: '功能' },
    ],
    is_container: true,
    description: '模态对话框',
  },
  {
    type: 'Message',
    name: '消息提示',
    category: ComponentCategory.FEEDBACK,
    icon: 'message-square',
    default_props: { type: 'info', content: '提示内容' },
    default_style: {},
    prop_schema: [
      {
        key: 'type',
        label: '类型',
        type: 'select',
        default: 'info',
        options: [
          { label: '信息', value: 'info' },
          { label: '成功', value: 'success' },
          { label: '警告', value: 'warning' },
          { label: '错误', value: 'error' },
        ],
        group: '内容',
      },
      { key: 'content', label: '内容', type: 'textarea', default: '提示内容', group: '内容' },
      { key: 'duration', label: '持续时间', type: 'number', default: 3, group: '样式' },
    ],
    is_container: false,
    description: '全局消息提示',
  },
  {
    type: 'Alert',
    name: '警告提示',
    category: ComponentCategory.FEEDBACK,
    icon: 'triangle-alert',
    default_props: { type: 'warning', message: '警告信息', showIcon: true },
    default_style: {},
    prop_schema: [
      {
        key: 'type',
        label: '类型',
        type: 'select',
        default: 'warning',
        options: [
          { label: '信息', value: 'info' },
          { label: '成功', value: 'success' },
          { label: '警告', value: 'warning' },
          { label: '错误', value: 'error' },
        ],
        group: '内容',
      },
      { key: 'message', label: '标题', type: 'string', default: '警告信息', group: '内容' },
      { key: 'description', label: '描述', type: 'textarea', group: '内容' },
      { key: 'showIcon', label: '显示图标', type: 'boolean', default: true, group: '样式' },
    ],
    is_container: false,
    description: '警告提示条',
  },
  {
    type: 'Chart',
    name: '图表',
    category: ComponentCategory.CHART,
    icon: 'bar-chart-3',
    default_props: { chartType: 'line', dataSource: [], width: 600, height: 400 },
    default_style: {},
    prop_schema: [
      {
        key: 'chartType',
        label: '图表类型',
        type: 'select',
        default: 'line',
        options: [
          { label: '折线图', value: 'line' },
          { label: '柱状图', value: 'bar' },
          { label: '饼图', value: 'pie' },
          { label: '散点图', value: 'scatter' },
          { label: '面积图', value: 'area' },
        ],
        group: '内容',
      },
      { key: 'dataSource', label: '数据', type: 'object', group: '内容' },
      { key: 'width', label: '宽度', type: 'number', default: 600, group: '样式' },
      { key: 'height', label: '高度', type: 'number', default: 400, group: '样式' },
      { key: 'title', label: '标题', type: 'string', group: '内容' },
    ],
    is_container: false,
    description: '数据可视化图表组件',
  },
  {
    type: 'Image',
    name: '图片',
    category: ComponentCategory.MEDIA,
    icon: 'image',
    default_props: { src: '', alt: '图片', fit: 'cover' },
    default_style: { width: '100%' },
    prop_schema: [
      { key: 'src', label: '地址', type: 'string', group: '内容' },
      { key: 'alt', label: '替代文本', type: 'string', default: '图片', group: '内容' },
      {
        key: 'fit',
        label: '填充方式',
        type: 'select',
        default: 'cover',
        options: [
          { label: '填充', value: 'fill' },
          { label: '包含', value: 'contain' },
          { label: '覆盖', value: 'cover' },
          { label: '无', value: 'none' },
        ],
        group: '样式',
      },
      { key: 'lazy', label: '懒加载', type: 'boolean', default: true, group: '功能' },
    ],
    is_container: false,
    description: '图片展示组件',
  },
  {
    type: 'Video',
    name: '视频',
    category: ComponentCategory.MEDIA,
    icon: 'video',
    default_props: { src: '', controls: true, autoplay: false },
    default_style: { width: '100%' },
    prop_schema: [
      { key: 'src', label: '地址', type: 'string', group: '内容' },
      { key: 'controls', label: '控制条', type: 'boolean', default: true, group: '功能' },
      { key: 'autoplay', label: '自动播放', type: 'boolean', default: false, group: '功能' },
      { key: 'loop', label: '循环', type: 'boolean', default: false, group: '功能' },
      { key: 'muted', label: '静音', type: 'boolean', default: false, group: '功能' },
    ],
    is_container: false,
    description: '视频播放组件',
  },
  {
    type: 'Text',
    name: '文本',
    category: ComponentCategory.UTILITY,
    icon: 'type',
    default_props: { content: '文本内容', level: 'body' },
    default_style: {},
    prop_schema: [
      { key: 'content', label: '内容', type: 'textarea', default: '文本内容', group: '内容' },
      {
        key: 'level',
        label: '层级',
        type: 'select',
        default: 'body',
        options: [
          { label: '标题1', value: 'h1' },
          { label: '标题2', value: 'h2' },
          { label: '标题3', value: 'h3' },
          { label: '正文', value: 'body' },
          { label: '说明', value: 'caption' },
        ],
        group: '样式',
      },
      {
        key: 'align',
        label: '对齐',
        type: 'select',
        options: [
          { label: '左', value: 'left' },
          { label: '中', value: 'center' },
          { label: '右', value: 'right' },
        ],
        group: '样式',
      },
    ],
    is_container: false,
    description: '通用文本展示组件',
  },
  {
    type: 'Icon',
    name: '图标',
    category: ComponentCategory.UTILITY,
    icon: 'star',
    default_props: { name: 'star', size: 24, color: 'grey.800' },
    default_style: {},
    prop_schema: [
      { key: 'name', label: '图标名', type: 'string', default: 'star', group: '内容' },
      { key: 'size', label: '尺寸', type: 'number', default: 24, group: '样式' },
      { key: 'color', label: '颜色', type: 'color', default: '#333', group: '样式' },
    ],
    is_container: false,
    description: '图标组件',
  },
];

type BuilderChangeListener = (pages: PageSchema[]) => void;

export class LowCodeBuilder {
  private components: Map<string, ComponentDefinition> = new Map();
  private pages: Map<string, PageSchema> = new Map();
  private selectedNodeIds: Map<string, string> = new Map();
  private config: BuilderConfig;
  private listeners: Set<BuilderChangeListener> = new Set();

  constructor(config?: Partial<BuilderConfig>) {
    this.config = {
      grid_size: 8,
      snap_to_grid: true,
      show_guides: true,
      responsive_breakpoints: DEFAULT_BREAKPOINTS,
      ...config,
    };
    this.initPresetComponents();
  }

  private initPresetComponents(): void {
    PRESET_COMPONENTS.forEach((comp) => {
      this.components.set(comp.type, { ...comp });
    });
  }

  // ==================== 组件定义管理 ====================

  listComponents(category?: ComponentCategory): ComponentDefinition[] {
    const all = Array.from(this.components.values());
    if (category) {
      return all.filter((c) => c.category === category);
    }
    return all;
  }

  getComponentDefinition(type: string): ComponentDefinition | undefined {
    return this.components.get(type);
  }

  registerComponent(definition: ComponentDefinition): boolean {
    if (this.components.has(definition.type)) return false;
    this.components.set(definition.type, { ...definition });
    return true;
  }

  getCategories(): { category: ComponentCategory; count: number }[] {
    return Object.values(ComponentCategory).map((category) => ({
      category,
      count: this.listComponents(category).length,
    }));
  }

  getBuilderConfig(): BuilderConfig {
    return { ...this.config };
  }

  updateBuilderConfig(config: Partial<BuilderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ==================== 页面管理 ====================

  createPage(pageId: string, name: string, description?: string): PageSchema {
    const now = Date.now();
    const page: PageSchema = {
      page_id: pageId,
      name,
      description,
      components: [],
      styles: {},
      data_sources: [],
      events: [],
      metadata: {
        title: name,
        description: description || '',
        created_at: now,
        updated_at: now,
        author: 'current-user',
        version: '1.0.0',
        responsive: true,
      },
    };
    this.pages.set(pageId, page);
    this.notifyListeners();
    return page;
  }

  getPage(pageId: string): PageSchema | undefined {
    return this.pages.get(pageId);
  }

  listPages(): PageSchema[] {
    return Array.from(this.pages.values()).sort(
      (a, b) => b.metadata.updated_at - a.metadata.updated_at
    );
  }

  deletePage(pageId: string): boolean {
    const deleted = this.pages.delete(pageId);
    if (deleted) {
      this.selectedNodeIds.delete(pageId);
      this.notifyListeners();
    }
    return deleted;
  }

  // ==================== 组件树操作 ====================

  addComponent(
    pageId: string,
    options: {
      type: string;
      parentId?: string;
      props?: Record<string, unknown>;
      style?: Record<string, string | number>;
      name?: string;
    },
    index?: number
  ): ComponentNode | null {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const definition = this.components.get(options.type);
    if (!definition) return null;

    const node: ComponentNode = {
      id: `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: options.type,
      name: options.name || definition.name,
      props: { ...definition.default_props, ...options.props },
      children: [],
      style: { ...definition.default_style, ...options.style },
      events: [],
    };

    if (options.parentId) {
      const parent = this.findComponent(page.components, options.parentId);
      if (!parent || !this.components.get(parent.type)?.is_container) return null;
      if (index !== undefined) {
        parent.children.splice(index, 0, node);
      } else {
        parent.children.push(node);
      }
    } else {
      if (index !== undefined) {
        page.components.splice(index, 0, node);
      } else {
        page.components.push(node);
      }
    }

    page.metadata.updated_at = Date.now();
    this.notifyListeners();
    return node;
  }

  removeComponent(pageId: string, componentId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;

    const removed = this.removeComponentRecursive(page.components, componentId);
    if (removed) {
      page.metadata.updated_at = Date.now();
      this.notifyListeners();
    }
    return removed;
  }

  private removeComponentRecursive(components: ComponentNode[], id: string): boolean {
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

  moveComponent(
    pageId: string,
    componentId: string,
    targetParentId: string | null,
    index?: number
  ): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;

    const node = this.findComponent(page.components, componentId);
    if (!node) return false;

    // 校验目标容器
    if (targetParentId) {
      const target = this.findComponent(page.components, targetParentId);
      if (!target || !this.components.get(target.type)?.is_container) return false;
      if (this.isDescendant(node, targetParentId)) return false;
    }

    this.removeComponentRecursive(page.components, componentId);
    const detached = { ...node };

    if (targetParentId) {
      const target = this.findComponent(page.components, targetParentId);
      if (!target) return false;
      if (index !== undefined) {
        target.children.splice(index, 0, detached);
      } else {
        target.children.push(detached);
      }
    } else {
      if (index !== undefined) {
        page.components.splice(index, 0, detached);
      } else {
        page.components.push(detached);
      }
    }

    page.metadata.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  private isDescendant(node: ComponentNode, targetId: string): boolean {
    if (node.id === targetId) return true;
    return node.children.some((child) => this.isDescendant(child, targetId));
  }

  getComponent(pageId: string, componentId: string): ComponentNode | undefined {
    const page = this.pages.get(pageId);
    if (!page) return undefined;
    return this.findComponent(page.components, componentId);
  }

  private findComponent(components: ComponentNode[], id: string): ComponentNode | undefined {
    for (const comp of components) {
      if (comp.id === id) return comp;
      const found = this.findComponent(comp.children, id);
      if (found) return found;
    }
    return undefined;
  }

  selectComponent(pageId: string, componentId: string | null): void {
    if (componentId) {
      this.selectedNodeIds.set(pageId, componentId);
    } else {
      this.selectedNodeIds.delete(pageId);
    }
  }

  getSelectedComponent(pageId: string): ComponentNode | undefined {
    const selectedId = this.selectedNodeIds.get(pageId);
    if (!selectedId) return undefined;
    return this.getComponent(pageId, selectedId);
  }

  // ==================== 属性与样式编辑 ====================

  updateProps(pageId: string, componentId: string, props: Record<string, unknown>): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const node = this.findComponent(page.components, componentId);
    if (!node) return false;

    node.props = { ...node.props, ...props };
    page.metadata.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  updateStyle(pageId: string, componentId: string, style: Record<string, string | number>): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const node = this.findComponent(page.components, componentId);
    if (!node) return false;

    node.style = { ...node.style, ...style };
    page.metadata.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  updateResponsiveStyle(
    pageId: string,
    componentId: string,
    breakpoint: 'mobile' | 'tablet' | 'desktop',
    style: Record<string, string | number>
  ): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const node = this.findComponent(page.components, componentId);
    if (!node) return false;

    node.responsive = {
      mobile: {},
      tablet: {},
      desktop: {},
      ...node.responsive,
      [breakpoint]: { ...(node.responsive?.[breakpoint] || {}), ...style },
    };
    page.metadata.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  toggleLock(pageId: string, componentId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const node = this.findComponent(page.components, componentId);
    if (!node) return false;
    node.locked = !node.locked;
    this.notifyListeners();
    return true;
  }

  toggleHidden(pageId: string, componentId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const node = this.findComponent(page.components, componentId);
    if (!node) return false;
    node.hidden = !node.hidden;
    this.notifyListeners();
    return true;
  }

  // ==================== 事件绑定 ====================

  bindEvent(pageId: string, componentId: string, binding: EventBinding): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const node = this.findComponent(page.components, componentId);
    if (!node) return false;

    const existingIdx = node.events.findIndex(
      (e) => e.event_name === binding.event_name && e.action_type === binding.action_type
    );
    if (existingIdx >= 0) {
      node.events[existingIdx] = binding;
    } else {
      node.events.push(binding);
    }

    page.metadata.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  unbindEvent(
    pageId: string,
    componentId: string,
    eventName: string,
    actionType: ActionType
  ): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const node = this.findComponent(page.components, componentId);
    if (!node) return false;

    const before = node.events.length;
    node.events = node.events.filter(
      (e) => !(e.event_name === eventName && e.action_type === actionType)
    );
    const changed = node.events.length !== before;
    if (changed) {
      page.metadata.updated_at = Date.now();
      this.notifyListeners();
    }
    return changed;
  }

  // ==================== 数据源绑定 ====================

  addDataSource(pageId: string, source: DataSourceConfig): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    if (page.data_sources.some((s) => s.source_id === source.source_id)) return false;
    page.data_sources.push(source);
    page.metadata.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  bindDataSource(pageId: string, componentId: string, binding: DataSourceBinding): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const node = this.findComponent(page.components, componentId);
    if (!node) return false;

    if (!page.data_sources.some((s) => s.source_id === binding.source_id)) return false;

    node.data_binding = binding;
    page.metadata.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  unbindDataSource(pageId: string, componentId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;
    const node = this.findComponent(page.components, componentId);
    if (!node || !node.data_binding) return false;
    node.data_binding = undefined;
    page.metadata.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  // ==================== 预览与导出 ====================

  previewPage(pageId: string): { schema: PageSchema; previewUrl: string } | null {
    const page = this.pages.get(pageId);
    if (!page) return null;
    return {
      schema: this.clonePage(page),
      previewUrl: `about:blank#preview:${pageId}`,
    };
  }

  exportCode(pageId: string, framework: 'react' | 'vue' = 'react'): ExportCodeResult | null {
    const page = this.pages.get(pageId);
    if (!page) return null;

    const files: ExportedFile[] = [];
    const dependencies = new Set<string>(['react', 'react-dom']);

    files.push({
      path: `src/pages/${page.name}.tsx`,
      language: 'typescript',
      content: this.generateReactComponent(page),
    });

    files.push({
      path: `src/pages/${page.name}.schema.json`,
      language: 'json',
      content: JSON.stringify(page, null, 2),
    });

    files.push({
      path: `src/pages/${page.name}.css`,
      language: 'css',
      content: this.generatePageCSS(page),
    });

    return {
      page_id: pageId,
      framework,
      files,
      dependencies: Array.from(dependencies),
    };
  }

  private generateReactComponent(page: PageSchema): string {
    const componentName = this.toPascalCase(page.name);
    const renderChildren = (nodes: ComponentNode[], indent: number): string => {
      const pad = '  '.repeat(indent);
      return nodes
        .map((node) => {
          const propsStr = Object.entries(node.props)
            .map(([k, v]) => `${k}={${JSON.stringify(v)}}`)
            .join(' ');
          const childrenStr =
            node.children.length > 0
              ? `\n${renderChildren(node.children, indent + 1)}\n${pad}`
              : '';
          return `${pad}<${node.type} ${propsStr}>${childrenStr}</${node.type}>`;
        })
        .join('\n');
    };

    return `import React from 'react';
import './${page.name}.css';

export interface ${componentName}Props {
  data?: Record<string, unknown>;
}

const ${componentName}: React.FC<${componentName}Props> = () => {
  return (
    <div className="${page.name}-page">
${renderChildren(page.components, 1)}
    </div>
  );
};

export default ${componentName};
`;
  }

  private generatePageCSS(page: PageSchema): string {
    const lines: string[] = [`.${page.name}-page {`];
    Object.entries(page.styles).forEach(([k, v]) => lines.push(`  ${this.kebabCase(k)}: ${v};`));
    lines.push('}');
    return lines.join('\n');
  }

  importSchema(schema: PageSchema): PageSchema | null {
    if (!schema.page_id || !schema.components) return null;
    this.pages.set(schema.page_id, this.clonePage(schema));
    this.notifyListeners();
    return schema;
  }

  exportSchema(pageId: string): PageSchema | null {
    const page = this.pages.get(pageId);
    if (!page) return null;
    return this.clonePage(page);
  }

  private clonePage(page: PageSchema): PageSchema {
    return JSON.parse(JSON.stringify(page)) as PageSchema;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)|^(.)/g, (_, c1, c2) => (c1 || c2).toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  private kebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
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
