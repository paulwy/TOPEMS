import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
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

interface PageMetadata {
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
  {
    name: 'mobile',
    label: i18n.t('microfrontend.builder.k0'),
    min_width: 0,
    max_width: 768,
    icon: 'smartphone',
  },
  {
    name: 'tablet',
    label: i18n.t('microfrontend.builder.k1'),
    min_width: 768,
    max_width: 1024,
    icon: 'tablet',
  },
  { name: 'desktop', label: i18n.t('microfrontend.builder.k2'), min_width: 1024, icon: 'monitor' },
];

const PRESET_COMPONENTS: ComponentDefinition[] = [
  {
    type: 'Container',
    name: i18n.t('microfrontend.builder.k3'),
    category: ComponentCategory.LAYOUT,
    icon: 'square',
    default_props: {},
    default_style: { display: 'flex', flexDirection: 'column', padding: 4, gap: 3 },
    prop_schema: [
      {
        key: 'direction',
        label: i18n.t('microfrontend.builder.k4'),
        type: 'select',
        default: 'column',
        options: [
          { label: i18n.t('microfrontend.builder.k5'), value: 'column' },
          { label: i18n.t('microfrontend.builder.k6'), value: 'row' },
        ],
        group: i18n.t('microfrontend.builder.k7'),
      },
      {
        key: 'gap',
        label: i18n.t('microfrontend.builder.k9'),
        type: 'string',
        default: '12px',
        group: i18n.t('microfrontend.builder.k8'),
      },
      {
        key: 'padding',
        label: i18n.t('microfrontend.builder.k11'),
        type: 'string',
        default: '16px',
        group: i18n.t('microfrontend.builder.k10'),
      },
    ],
    is_container: true,
    description: i18n.t('microfrontend.builder.k12'),
  },
  {
    type: 'Row',
    name: i18n.t('microfrontend.builder.k13'),
    category: ComponentCategory.LAYOUT,
    icon: 'rows-three',
    default_props: { gutter: 16 },
    default_style: { display: 'flex', flexDirection: 'row' },
    prop_schema: [
      {
        key: 'gutter',
        label: i18n.t('microfrontend.builder.k15'),
        type: 'number',
        default: 16,
        group: i18n.t('microfrontend.builder.k14'),
      },
      {
        key: 'align',
        label: i18n.t('microfrontend.builder.k16'),
        type: 'select',
        options: [
          { label: i18n.t('microfrontend.builder.k17'), value: 'flex-start' },
          { label: i18n.t('microfrontend.builder.k18'), value: 'center' },
          { label: i18n.t('microfrontend.builder.k19'), value: 'flex-end' },
        ],
        group: i18n.t('microfrontend.builder.k20'),
      },
    ],
    is_container: true,
    description: i18n.t('microfrontend.builder.k21'),
  },
  {
    type: 'Column',
    name: i18n.t('microfrontend.builder.k22'),
    category: ComponentCategory.LAYOUT,
    icon: 'columns-three',
    default_props: { span: 12 },
    default_style: { flex: '1' },
    prop_schema: [
      {
        key: 'span',
        label: i18n.t('microfrontend.builder.k24'),
        type: 'number',
        default: 12,
        group: i18n.t('microfrontend.builder.k23'),
      },
      {
        key: 'offset',
        label: i18n.t('microfrontend.builder.k26'),
        type: 'number',
        default: 0,
        group: i18n.t('microfrontend.builder.k25'),
      },
    ],
    is_container: true,
    description: i18n.t('microfrontend.builder.k27'),
  },
  {
    type: 'Grid',
    name: i18n.t('microfrontend.builder.k28'),
    category: ComponentCategory.LAYOUT,
    icon: 'layout-grid',
    default_props: { columns: 3, gap: 16 },
    default_style: { display: 'grid' },
    prop_schema: [
      {
        key: 'columns',
        label: i18n.t('microfrontend.builder.k30'),
        type: 'number',
        default: 3,
        group: i18n.t('microfrontend.builder.k29'),
      },
      {
        key: 'gap',
        label: i18n.t('microfrontend.builder.k32'),
        type: 'string',
        default: '16px',
        group: i18n.t('microfrontend.builder.k31'),
      },
    ],
    is_container: true,
    description: i18n.t('microfrontend.builder.cssgrid_0'),
  },
  {
    type: 'Card',
    name: i18n.t('microfrontend.builder.k33'),
    category: ComponentCategory.DISPLAY,
    icon: 'rectangle-horizontal',
    default_props: { title: i18n.t('microfrontend.builder.k34'), bordered: true },
    default_style: {
      background: 'common.white',
      borderRadius: 'md',
      padding: 4,
      boxShadow: designTokens.shadows.sm,
    },
    prop_schema: [
      {
        key: 'title',
        label: i18n.t('microfrontend.builder.k37'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k36'),
        group: i18n.t('microfrontend.builder.k35'),
      },
      {
        key: 'bordered',
        label: i18n.t('microfrontend.builder.k39'),
        type: 'boolean',
        default: true,
        group: i18n.t('microfrontend.builder.k38'),
      },
      {
        key: 'shadow',
        label: i18n.t('microfrontend.builder.k40'),
        type: 'select',
        options: [
          { label: i18n.t('microfrontend.builder.k41'), value: 'none' },
          { label: i18n.t('microfrontend.builder.k42'), value: 'sm' },
          { label: i18n.t('microfrontend.builder.k43'), value: 'md' },
          { label: i18n.t('microfrontend.builder.k44'), value: 'lg' },
        ],
        group: i18n.t('microfrontend.builder.k45'),
      },
    ],
    is_container: true,
    description: i18n.t('microfrontend.builder.k46'),
  },
  {
    type: 'Button',
    name: i18n.t('microfrontend.builder.k47'),
    category: ComponentCategory.FORM,
    icon: 'mouse-pointer-click',
    default_props: { text: i18n.t('microfrontend.builder.k48'), type: 'primary', size: 'medium' },
    default_style: {},
    prop_schema: [
      {
        key: 'text',
        label: i18n.t('microfrontend.builder.k51'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k50'),
        group: i18n.t('microfrontend.builder.k49'),
      },
      {
        key: 'type',
        label: i18n.t('microfrontend.builder.k52'),
        type: 'select',
        default: 'primary',
        options: [
          { label: i18n.t('microfrontend.builder.k53'), value: 'primary' },
          { label: i18n.t('microfrontend.builder.k54'), value: 'default' },
          { label: i18n.t('microfrontend.builder.k55'), value: 'danger' },
          { label: i18n.t('microfrontend.builder.k56'), value: 'link' },
        ],
        group: i18n.t('microfrontend.builder.k57'),
      },
      {
        key: 'size',
        label: i18n.t('microfrontend.builder.k58'),
        type: 'select',
        default: 'medium',
        options: [
          { label: i18n.t('microfrontend.builder.k59'), value: 'small' },
          { label: i18n.t('microfrontend.builder.k60'), value: 'medium' },
          { label: i18n.t('microfrontend.builder.k61'), value: 'large' },
        ],
        group: i18n.t('microfrontend.builder.k62'),
      },
      {
        key: 'disabled',
        label: i18n.t('microfrontend.builder.k64'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k63'),
      },
      {
        key: 'loading',
        label: i18n.t('microfrontend.builder.k66'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k65'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k67'),
  },
  {
    type: 'Input',
    name: i18n.t('microfrontend.builder.k68'),
    category: ComponentCategory.FORM,
    icon: 'text-cursor-input',
    default_props: { placeholder: i18n.t('microfrontend.builder.k69'), value: '' },
    default_style: { width: '100%' },
    prop_schema: [
      {
        key: 'placeholder',
        label: i18n.t('microfrontend.builder.k72'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k71'),
        group: i18n.t('microfrontend.builder.k70'),
      },
      {
        key: 'value',
        label: i18n.t('microfrontend.builder.k74'),
        type: 'string',
        group: i18n.t('microfrontend.builder.k73'),
      },
      {
        key: 'type',
        label: i18n.t('microfrontend.builder.k75'),
        type: 'select',
        default: 'text',
        options: [
          { label: i18n.t('microfrontend.builder.k76'), value: 'text' },
          { label: i18n.t('microfrontend.builder.k77'), value: 'password' },
          { label: i18n.t('microfrontend.builder.k78'), value: 'number' },
          { label: i18n.t('microfrontend.builder.k79'), value: 'email' },
        ],
        group: i18n.t('microfrontend.builder.k80'),
      },
      {
        key: 'disabled',
        label: i18n.t('microfrontend.builder.k82'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k81'),
      },
      {
        key: 'readonly',
        label: i18n.t('microfrontend.builder.k84'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k83'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k85'),
  },
  {
    type: 'Textarea',
    name: i18n.t('microfrontend.builder.k86'),
    category: ComponentCategory.FORM,
    icon: 'text',
    default_props: { placeholder: i18n.t('microfrontend.builder.k87'), rows: 4 },
    default_style: { width: '100%' },
    prop_schema: [
      {
        key: 'placeholder',
        label: i18n.t('microfrontend.builder.k88'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k89'),
        group: i18n.t('microfrontend.builder.k90'),
      },
      {
        key: 'rows',
        label: i18n.t('microfrontend.builder.k92'),
        type: 'number',
        default: 4,
        group: i18n.t('microfrontend.builder.k91'),
      },
      {
        key: 'maxLength',
        label: i18n.t('microfrontend.builder.k94'),
        type: 'number',
        group: i18n.t('microfrontend.builder.k93'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k95'),
  },
  {
    type: 'Select',
    name: i18n.t('microfrontend.builder.k96'),
    category: ComponentCategory.FORM,
    icon: 'chevron-down-square',
    default_props: { placeholder: i18n.t('microfrontend.builder.k97'), options: [] },
    default_style: { width: '100%' },
    prop_schema: [
      {
        key: 'placeholder',
        label: i18n.t('microfrontend.builder.k100'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k99'),
        group: i18n.t('microfrontend.builder.k98'),
      },
      {
        key: 'options',
        label: i18n.t('microfrontend.builder.k102'),
        type: 'object',
        group: i18n.t('microfrontend.builder.k101'),
      },
      {
        key: 'multiple',
        label: i18n.t('microfrontend.builder.k104'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k103'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k105'),
  },
  {
    type: 'Checkbox',
    name: i18n.t('microfrontend.builder.k106'),
    category: ComponentCategory.FORM,
    icon: 'check-square',
    default_props: { label: i18n.t('microfrontend.builder.k107'), checked: false },
    default_style: {},
    prop_schema: [
      {
        key: 'label',
        label: i18n.t('microfrontend.builder.k110'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k109'),
        group: i18n.t('microfrontend.builder.k108'),
      },
      {
        key: 'checked',
        label: i18n.t('microfrontend.builder.k112'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k111'),
      },
      {
        key: 'disabled',
        label: i18n.t('microfrontend.builder.k114'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k113'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k115'),
  },
  {
    type: 'Radio',
    name: i18n.t('microfrontend.builder.k116'),
    category: ComponentCategory.FORM,
    icon: 'circle',
    default_props: { label: i18n.t('microfrontend.builder.k117'), options: [] },
    default_style: {},
    prop_schema: [
      {
        key: 'label',
        label: i18n.t('microfrontend.builder.k120'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k119'),
        group: i18n.t('microfrontend.builder.k118'),
      },
      {
        key: 'options',
        label: i18n.t('microfrontend.builder.k122'),
        type: 'object',
        group: i18n.t('microfrontend.builder.k121'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k123'),
  },
  {
    type: 'DatePicker',
    name: i18n.t('microfrontend.builder.k124'),
    category: ComponentCategory.FORM,
    icon: 'calendar',
    default_props: { placeholder: i18n.t('microfrontend.builder.k125') },
    default_style: { width: '100%' },
    prop_schema: [
      {
        key: 'placeholder',
        label: i18n.t('microfrontend.builder.k126'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k127'),
        group: i18n.t('microfrontend.builder.k128'),
      },
      {
        key: 'format',
        label: i18n.t('microfrontend.builder.k130'),
        type: 'string',
        default: 'YYYY-MM-DD',
        group: i18n.t('microfrontend.builder.k129'),
      },
      {
        key: 'showTime',
        label: i18n.t('microfrontend.builder.k132'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k131'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k133'),
  },
  {
    type: 'Form',
    name: i18n.t('microfrontend.builder.k134'),
    category: ComponentCategory.FORM,
    icon: 'form-input',
    default_props: { labelWidth: 100, layout: 'horizontal' },
    default_style: {},
    prop_schema: [
      {
        key: 'labelWidth',
        label: i18n.t('microfrontend.builder.k136'),
        type: 'number',
        default: 100,
        group: i18n.t('microfrontend.builder.k135'),
      },
      {
        key: 'layout',
        label: i18n.t('microfrontend.builder.k137'),
        type: 'select',
        default: 'horizontal',
        options: [
          { label: i18n.t('microfrontend.builder.k138'), value: 'horizontal' },
          { label: i18n.t('microfrontend.builder.k139'), value: 'vertical' },
          { label: i18n.t('microfrontend.builder.k140'), value: 'inline' },
        ],
        group: i18n.t('microfrontend.builder.k141'),
      },
    ],
    is_container: true,
    description: i18n.t('microfrontend.builder.k142'),
  },
  {
    type: 'Table',
    name: i18n.t('microfrontend.builder.k143'),
    category: ComponentCategory.DISPLAY,
    icon: 'table',
    default_props: { columns: [], dataSource: [], pagination: true },
    default_style: { width: '100%' },
    prop_schema: [
      {
        key: 'columns',
        label: i18n.t('microfrontend.builder.k145'),
        type: 'object',
        group: i18n.t('microfrontend.builder.k144'),
      },
      {
        key: 'dataSource',
        label: i18n.t('microfrontend.builder.k147'),
        type: 'object',
        group: i18n.t('microfrontend.builder.k146'),
      },
      {
        key: 'pagination',
        label: i18n.t('microfrontend.builder.k149'),
        type: 'boolean',
        default: true,
        group: i18n.t('microfrontend.builder.k148'),
      },
      {
        key: 'bordered',
        label: i18n.t('microfrontend.builder.k151'),
        type: 'boolean',
        default: true,
        group: i18n.t('microfrontend.builder.k150'),
      },
      {
        key: 'rowSelection',
        label: i18n.t('microfrontend.builder.k153'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k152'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k154'),
  },
  {
    type: 'Tabs',
    name: i18n.t('microfrontend.builder.k155'),
    category: ComponentCategory.NAVIGATION,
    icon: 'tabs',
    default_props: { tabs: [], activeKey: '' },
    default_style: {},
    prop_schema: [
      {
        key: 'tabs',
        label: i18n.t('microfrontend.builder.k157'),
        type: 'object',
        group: i18n.t('microfrontend.builder.k156'),
      },
      {
        key: 'activeKey',
        label: i18n.t('microfrontend.builder.k159'),
        type: 'string',
        group: i18n.t('microfrontend.builder.k158'),
      },
      {
        key: 'type',
        label: i18n.t('microfrontend.builder.k160'),
        type: 'select',
        default: 'line',
        options: [
          { label: i18n.t('microfrontend.builder.k161'), value: 'line' },
          { label: i18n.t('microfrontend.builder.k162'), value: 'card' },
        ],
        group: i18n.t('microfrontend.builder.k163'),
      },
    ],
    is_container: true,
    description: i18n.t('microfrontend.builder.k164'),
  },
  {
    type: 'Menu',
    name: i18n.t('microfrontend.builder.k165'),
    category: ComponentCategory.NAVIGATION,
    icon: 'menu',
    default_props: { items: [], mode: 'horizontal' },
    default_style: {},
    prop_schema: [
      {
        key: 'items',
        label: i18n.t('microfrontend.builder.k167'),
        type: 'object',
        group: i18n.t('microfrontend.builder.k166'),
      },
      {
        key: 'mode',
        label: i18n.t('microfrontend.builder.k168'),
        type: 'select',
        default: 'horizontal',
        options: [
          { label: i18n.t('microfrontend.builder.k169'), value: 'horizontal' },
          { label: i18n.t('microfrontend.builder.k170'), value: 'vertical' },
          { label: i18n.t('microfrontend.builder.k171'), value: 'inline' },
        ],
        group: i18n.t('microfrontend.builder.k172'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k173'),
  },
  {
    type: 'Breadcrumb',
    name: i18n.t('microfrontend.builder.k174'),
    category: ComponentCategory.NAVIGATION,
    icon: 'route',
    default_props: { items: [] },
    default_style: {},
    prop_schema: [
      {
        key: 'items',
        label: i18n.t('microfrontend.builder.k176'),
        type: 'object',
        group: i18n.t('microfrontend.builder.k175'),
      },
      {
        key: 'separator',
        label: i18n.t('microfrontend.builder.k178'),
        type: 'string',
        default: '/',
        group: i18n.t('microfrontend.builder.k177'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k179'),
  },
  {
    type: 'Dialog',
    name: i18n.t('microfrontend.builder.k180'),
    category: ComponentCategory.FEEDBACK,
    icon: 'panel-top',
    default_props: { title: i18n.t('microfrontend.builder.k181'), visible: false, width: 520 },
    default_style: {},
    prop_schema: [
      {
        key: 'title',
        label: i18n.t('microfrontend.builder.k184'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k183'),
        group: i18n.t('microfrontend.builder.k182'),
      },
      {
        key: 'visible',
        label: i18n.t('microfrontend.builder.k186'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k185'),
      },
      {
        key: 'width',
        label: i18n.t('microfrontend.builder.k188'),
        type: 'number',
        default: 520,
        group: i18n.t('microfrontend.builder.k187'),
      },
      {
        key: 'maskClosable',
        label: i18n.t('microfrontend.builder.k190'),
        type: 'boolean',
        default: true,
        group: i18n.t('microfrontend.builder.k189'),
      },
    ],
    is_container: true,
    description: i18n.t('microfrontend.builder.k191'),
  },
  {
    type: 'Message',
    name: i18n.t('microfrontend.builder.k192'),
    category: ComponentCategory.FEEDBACK,
    icon: 'message-square',
    default_props: { type: 'info', content: i18n.t('microfrontend.builder.k193') },
    default_style: {},
    prop_schema: [
      {
        key: 'type',
        label: i18n.t('microfrontend.builder.k194'),
        type: 'select',
        default: 'info',
        options: [
          { label: i18n.t('microfrontend.builder.k195'), value: 'info' },
          { label: i18n.t('microfrontend.builder.k196'), value: 'success' },
          { label: i18n.t('microfrontend.builder.k197'), value: 'warning' },
          { label: i18n.t('microfrontend.builder.k198'), value: 'error' },
        ],
        group: i18n.t('microfrontend.builder.k199'),
      },
      {
        key: 'content',
        label: i18n.t('microfrontend.builder.k200'),
        type: 'textarea',
        default: i18n.t('microfrontend.builder.k201'),
        group: i18n.t('microfrontend.builder.k202'),
      },
      {
        key: 'duration',
        label: i18n.t('microfrontend.builder.k204'),
        type: 'number',
        default: 3,
        group: i18n.t('microfrontend.builder.k203'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k205'),
  },
  {
    type: 'Alert',
    name: i18n.t('microfrontend.builder.k206'),
    category: ComponentCategory.FEEDBACK,
    icon: 'triangle-alert',
    default_props: {
      type: 'warning',
      message: i18n.t('microfrontend.builder.k207'),
      showIcon: true,
    },
    default_style: {},
    prop_schema: [
      {
        key: 'type',
        label: i18n.t('microfrontend.builder.k208'),
        type: 'select',
        default: 'warning',
        options: [
          { label: i18n.t('microfrontend.builder.k209'), value: 'info' },
          { label: i18n.t('microfrontend.builder.k210'), value: 'success' },
          { label: i18n.t('microfrontend.builder.k211'), value: 'warning' },
          { label: i18n.t('microfrontend.builder.k212'), value: 'error' },
        ],
        group: i18n.t('microfrontend.builder.k213'),
      },
      {
        key: 'message',
        label: i18n.t('microfrontend.builder.k216'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k215'),
        group: i18n.t('microfrontend.builder.k214'),
      },
      {
        key: 'description',
        label: i18n.t('microfrontend.builder.k218'),
        type: 'textarea',
        group: i18n.t('microfrontend.builder.k217'),
      },
      {
        key: 'showIcon',
        label: i18n.t('microfrontend.builder.k220'),
        type: 'boolean',
        default: true,
        group: i18n.t('microfrontend.builder.k219'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k221'),
  },
  {
    type: 'Chart',
    name: i18n.t('microfrontend.builder.k222'),
    category: ComponentCategory.CHART,
    icon: 'bar-chart-3',
    default_props: { chartType: 'line', dataSource: [], width: 600, height: 400 },
    default_style: {},
    prop_schema: [
      {
        key: 'chartType',
        label: i18n.t('microfrontend.builder.k223'),
        type: 'select',
        default: 'line',
        options: [
          { label: i18n.t('microfrontend.builder.k224'), value: 'line' },
          { label: i18n.t('microfrontend.builder.k225'), value: 'bar' },
          { label: i18n.t('microfrontend.builder.k226'), value: 'pie' },
          { label: i18n.t('microfrontend.builder.k227'), value: 'scatter' },
          { label: i18n.t('microfrontend.builder.k228'), value: 'area' },
        ],
        group: i18n.t('microfrontend.builder.k229'),
      },
      {
        key: 'dataSource',
        label: i18n.t('microfrontend.builder.k231'),
        type: 'object',
        group: i18n.t('microfrontend.builder.k230'),
      },
      {
        key: 'width',
        label: i18n.t('microfrontend.builder.k233'),
        type: 'number',
        default: 600,
        group: i18n.t('microfrontend.builder.k232'),
      },
      {
        key: 'height',
        label: i18n.t('microfrontend.builder.k235'),
        type: 'number',
        default: 400,
        group: i18n.t('microfrontend.builder.k234'),
      },
      {
        key: 'title',
        label: i18n.t('microfrontend.builder.k237'),
        type: 'string',
        group: i18n.t('microfrontend.builder.k236'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k238'),
  },
  {
    type: 'Image',
    name: i18n.t('microfrontend.builder.k239'),
    category: ComponentCategory.MEDIA,
    icon: 'image',
    default_props: { src: '', alt: i18n.t('microfrontend.builder.k240'), fit: 'cover' },
    default_style: { width: '100%' },
    prop_schema: [
      {
        key: 'src',
        label: i18n.t('microfrontend.builder.k242'),
        type: 'string',
        group: i18n.t('microfrontend.builder.k241'),
      },
      {
        key: 'alt',
        label: i18n.t('microfrontend.builder.k245'),
        type: 'string',
        default: i18n.t('microfrontend.builder.k244'),
        group: i18n.t('microfrontend.builder.k243'),
      },
      {
        key: 'fit',
        label: i18n.t('microfrontend.builder.k246'),
        type: 'select',
        default: 'cover',
        options: [
          { label: i18n.t('microfrontend.builder.k247'), value: 'fill' },
          { label: i18n.t('microfrontend.builder.k248'), value: 'contain' },
          { label: i18n.t('microfrontend.builder.k249'), value: 'cover' },
          { label: i18n.t('microfrontend.builder.k250'), value: 'none' },
        ],
        group: i18n.t('microfrontend.builder.k251'),
      },
      {
        key: 'lazy',
        label: i18n.t('microfrontend.builder.k253'),
        type: 'boolean',
        default: true,
        group: i18n.t('microfrontend.builder.k252'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k254'),
  },
  {
    type: 'Video',
    name: i18n.t('microfrontend.builder.k255'),
    category: ComponentCategory.MEDIA,
    icon: 'video',
    default_props: { src: '', controls: true, autoplay: false },
    default_style: { width: '100%' },
    prop_schema: [
      {
        key: 'src',
        label: i18n.t('microfrontend.builder.k257'),
        type: 'string',
        group: i18n.t('microfrontend.builder.k256'),
      },
      {
        key: 'controls',
        label: i18n.t('microfrontend.builder.k259'),
        type: 'boolean',
        default: true,
        group: i18n.t('microfrontend.builder.k258'),
      },
      {
        key: 'autoplay',
        label: i18n.t('microfrontend.builder.k261'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k260'),
      },
      {
        key: 'loop',
        label: i18n.t('microfrontend.builder.k263'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k262'),
      },
      {
        key: 'muted',
        label: i18n.t('microfrontend.builder.k265'),
        type: 'boolean',
        default: false,
        group: i18n.t('microfrontend.builder.k264'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k266'),
  },
  {
    type: 'Text',
    name: i18n.t('microfrontend.builder.k267'),
    category: ComponentCategory.UTILITY,
    icon: 'type',
    default_props: { content: i18n.t('microfrontend.builder.k268'), level: 'body' },
    default_style: {},
    prop_schema: [
      {
        key: 'content',
        label: i18n.t('microfrontend.builder.k269'),
        type: 'textarea',
        default: i18n.t('microfrontend.builder.k270'),
        group: i18n.t('microfrontend.builder.k271'),
      },
      {
        key: 'level',
        label: i18n.t('microfrontend.builder.k272'),
        type: 'select',
        default: 'body',
        options: [
          { label: i18n.t('microfrontend.builder.1_273'), value: 'h1' },
          { label: i18n.t('microfrontend.builder.2_274'), value: 'h2' },
          { label: i18n.t('microfrontend.builder.3_275'), value: 'h3' },
          { label: i18n.t('microfrontend.builder.k276'), value: 'body' },
          { label: i18n.t('microfrontend.builder.k277'), value: 'caption' },
        ],
        group: i18n.t('microfrontend.builder.k278'),
      },
      {
        key: 'align',
        label: i18n.t('microfrontend.builder.k279'),
        type: 'select',
        options: [
          { label: i18n.t('microfrontend.builder.k280'), value: 'left' },
          { label: i18n.t('microfrontend.builder.k281'), value: 'center' },
          { label: i18n.t('microfrontend.builder.k282'), value: 'right' },
        ],
        group: i18n.t('microfrontend.builder.k283'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k284'),
  },
  {
    type: 'Icon',
    name: i18n.t('microfrontend.builder.k285'),
    category: ComponentCategory.UTILITY,
    icon: 'star',
    default_props: { name: 'star', size: 24, color: 'grey.800' },
    default_style: {},
    prop_schema: [
      {
        key: 'name',
        label: i18n.t('microfrontend.builder.k287'),
        type: 'string',
        default: 'star',
        group: i18n.t('microfrontend.builder.k286'),
      },
      {
        key: 'size',
        label: i18n.t('microfrontend.builder.k289'),
        type: 'number',
        default: 24,
        group: i18n.t('microfrontend.builder.k288'),
      },
      {
        key: 'color',
        label: i18n.t('microfrontend.builder.k291'),
        type: 'color',
        default: designTokens.colors.grey[800],
        group: i18n.t('microfrontend.builder.k290'),
      },
    ],
    is_container: false,
    description: i18n.t('microfrontend.builder.k292'),
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

  updateStyle(
    pageId: string,
    componentId: string,
    style: Record<string, string | number>
  ): boolean {
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
