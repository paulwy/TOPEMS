// 低代码平台核心类型定义
// 对应 src/api/lowcode/ 下 6 个 API 文件：apps / dataModels / dataSources / forms / pages / workflows

// ============================================================================
// 通用分页与查询参数
// ============================================================================

export interface LowcodePaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  /** 按应用过滤（大部分低代码资源都归属某个应用） */
  app_id?: string;
  /** 按状态过滤 */
  status?: string;
}

// ============================================================================
// 1. 应用（App）
// ============================================================================

export type LowcodeAppStatus = 'draft' | 'published' | 'unpublished' | 'archived';

export interface LowcodeApp {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  status: LowcodeAppStatus;
  /** 应用版本号，发布后自增 */
  version: number;
  /** 应用归属租户 */
  tenant_id?: string;
  /** 应用创建人 */
  created_by?: string;
  /** 应用访问路径前缀，如 /app/leave-request */
  access_path?: string;
  /** 应用首页 page_id */
  home_page_id?: string;
  /** 应用配置（主题、导航等） */
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface CreateLowcodeAppRequest {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  access_path?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateLowcodeAppRequest {
  name?: string;
  description?: string;
  icon?: string;
  access_path?: string;
  home_page_id?: string;
  settings?: Record<string, unknown>;
  status?: LowcodeAppStatus;
}

// ============================================================================
// 2. 数据模型（DataModel）
// ============================================================================

export type DataModelFieldType =
  | 'string'
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'enum'
  | 'json'
  | 'reference'
  | 'file'
  | 'image';

export interface DataModelField {
  id: string;
  model_id: string;
  /** 字段物理名（表列名），snake_case */
  field_name: string;
  /** 字段显示名 */
  label: string;
  field_type: DataModelFieldType;
  /** 是否可空 */
  nullable: boolean;
  /** 是否主键 */
  is_primary_key: boolean;
  /** 是否唯一 */
  unique: boolean;
  /** 默认值（字符串表达，后端按 field_type 解析） */
  default_value?: string;
  /** enum 类型候选值 */
  options?: string[];
  /** reference 类型指向的关联模型 id */
  reference_model_id?: string;
  /** reference 关联字段 */
  reference_field_id?: string;
  /** 字段长度（string/decimal 用） */
  length?: number;
  decimal_places?: number;
  /** 校验规则（正则、min/max 等） */
  validation?: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LowcodeDataModel {
  id: string;
  app_id: string;
  /** 模型物理名（表名），snake_case */
  model_name: string;
  /** 模型显示名 */
  label: string;
  description?: string;
  /** 是否已生成物理表 */
  materialized: boolean;
  /** 物理表名（生成后由后端填入） */
  table_name?: string;
  fields: DataModelField[];
  /** 索引定义 */
  indexes?: Array<{
    name: string;
    fields: string[];
    unique: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CreateLowcodeDataModelRequest {
  app_id: string;
  model_name: string;
  label: string;
  description?: string;
  fields?: Array<Omit<DataModelField, 'id' | 'model_id' | 'created_at' | 'updated_at'>>;
  indexes?: Array<{ name: string; fields: string[]; unique: boolean }>;
}

export interface UpdateLowcodeDataModelRequest {
  label?: string;
  description?: string;
  fields?: Array<Omit<DataModelField, 'id' | 'model_id' | 'created_at' | 'updated_at'>>;
  indexes?: Array<{ name: string; fields: string[]; unique: boolean }>;
}

// ============================================================================
// 3. 数据源（DataSource）
// ============================================================================

export type DataSourceType = 'mysql' | 'postgres' | 'sqlite' | 'rest' | 'mongodb' | 'redis';

export interface LowcodeDataSource {
  id: string;
  app_id: string;
  name: string;
  type: DataSourceType;
  /** 连接配置（密码字段后端返回时 mask） */
  config: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    /** 仅写入时携带，读取时为空字符串或 mask */
    password?: string;
    /** REST 类型的 baseURL */
    base_url?: string;
    /** REST 类型的 headers */
    headers?: Record<string, string>;
    /** REST 类型的鉴权方式 */
    auth_type?: 'none' | 'basic' | 'bearer' | 'api_key';
    /** 额外参数 */
    options?: Record<string, unknown>;
  };
  /** 是否启用 SSL */
  ssl_enabled: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'untested';
  /** 最近一次测试连接时间 */
  last_tested_at?: string;
  /** 最近一次测试连接错误信息 */
  last_error?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLowcodeDataSourceRequest {
  app_id: string;
  name: string;
  type: DataSourceType;
  config: LowcodeDataSource['config'];
  ssl_enabled?: boolean;
  description?: string;
}

export interface UpdateLowcodeDataSourceRequest {
  name?: string;
  config?: LowcodeDataSource['config'];
  ssl_enabled?: boolean;
  description?: string;
}

export interface DataSourceTestResult {
  success: boolean;
  message: string;
  /** 连接延迟（毫秒） */
  latency_ms?: number;
  /** 服务端版本信息 */
  server_version?: string;
}

// ============================================================================
// 4. 表单（Form）
// ============================================================================

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'switch'
  | 'upload'
  | 'richeditor'
  | 'cascader'
  | 'reference';

export interface FormField {
  id: string;
  form_id: string;
  /** 组件标识（与数据模型字段对应，可空） */
  field_name: string;
  /** 组件显示标签 */
  label: string;
  field_type: FormFieldType;
  /** 绑定的数据模型字段 id */
  data_model_field_id?: string;
  /** 是否必填 */
  required: boolean;
  /** 是否只读 */
  readonly: boolean;
  /** 默认值 */
  default_value?: unknown;
  /** 占位提示 */
  placeholder?: string;
  /** 选项（select/radio/checkbox 用） */
  options?: Array<{ label: string; value: string }>;
  /** 校验规则 */
  validation?: Record<string, unknown>;
  /** 栅格布局（24 栅格） */
  span?: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LowcodeForm {
  id: string;
  app_id: string;
  /** 表单编码（唯一） */
  code: string;
  name: string;
  description?: string;
  /** 绑定的数据模型 id */
  data_model_id?: string;
  /** 表单字段定义 */
  fields: FormField[];
  /** 表单布局配置 */
  layout?: {
    /** label 位置 */
    label_position?: 'left' | 'right' | 'top';
    /** 栅格间距 */
    gutter?: number;
    /** 自定义布局 */
    custom?: Record<string, unknown>;
  };
  status: 'draft' | 'published';
  version: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface CreateLowcodeFormRequest {
  app_id: string;
  code: string;
  name: string;
  description?: string;
  data_model_id?: string;
  fields?: Array<Omit<FormField, 'id' | 'form_id' | 'created_at' | 'updated_at'>>;
  layout?: LowcodeForm['layout'];
}

export interface UpdateLowcodeFormRequest {
  name?: string;
  description?: string;
  data_model_id?: string;
  fields?: Array<Omit<FormField, 'id' | 'form_id' | 'created_at' | 'updated_at'>>;
  layout?: LowcodeForm['layout'];
  status?: 'draft' | 'published';
}

// ============================================================================
// 5. 页面（Page）
// ============================================================================

export type LowcodePageType =
  | 'list'
  | 'detail'
  | 'form'
  | 'dashboard'
  | 'custom'
  | 'external_link';

export interface PageComponent {
  id: string;
  /** 组件类型：table / form / chart / button / container / ... */
  type: string;
  /** 组件显示名 */
  name: string;
  /** 绑定的表单 id */
  form_id?: string;
  /** 绑定的数据源 id */
  data_source_id?: string;
  /** 绑定的数据模型 id */
  data_model_id?: string;
  /** 组件属性 */
  props: Record<string, unknown>;
  /** 子组件（容器类组件用） */
  children?: PageComponent[];
}

export interface LowcodePage {
  id: string;
  app_id: string;
  /** 页面编码（应用内唯一） */
  code: string;
  name: string;
  description?: string;
  type: LowcodePageType;
  /** 路由路径（应用内相对路径，如 /list） */
  route_path: string;
  /** 页面组件树 */
  components: PageComponent[];
  /** 页面是否设为应用首页 */
  is_home: boolean;
  status: 'draft' | 'published';
  version: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface CreateLowcodePageRequest {
  app_id: string;
  code: string;
  name: string;
  description?: string;
  type: LowcodePageType;
  route_path: string;
  components?: Array<Omit<PageComponent, 'id'>>;
  is_home?: boolean;
}

export interface UpdateLowcodePageRequest {
  name?: string;
  description?: string;
  type?: LowcodePageType;
  route_path?: string;
  components?: Array<Omit<PageComponent, 'id'>>;
  is_home?: boolean;
  status?: 'draft' | 'published';
}

/**
 * 表单提交钩子响应
 *
 * 当 lowcode 页面表单提交时，后端会触发所有与该页面关联的 automation rule，
 * 并在响应中返回被触发的 rule ID 列表。
 */
export interface FormSubmitHookResponse {
  /** 本次表单提交触发到的 automation rule ID 列表 */
  triggered_rules: string[];
}

// ============================================================================
// 6. 低代码内嵌工作流（Workflow）
// ============================================================================

export type LowcodeWorkflowTriggerType =
  | 'manual'
  | 'form_submit'
  | 'schedule'
  | 'event'
  | 'webhook';

export type LowcodeWorkflowNodeType =
  | 'start'
  | 'end'
  | 'approval'
  | 'condition'
  | 'api_call'
  | 'data_operation'
  | 'notification'
  | 'delay'
  | 'subprocess';

export interface LowcodeWorkflowNode {
  id: string;
  /** 节点类型 */
  type: LowcodeWorkflowNodeType;
  /** 节点显示名 */
  name: string;
  /** 节点配置（如审批人、API 地址、数据操作类型等） */
  config: Record<string, unknown>;
  /** 下游节点 id 列表 */
  next_nodes?: string[];
  /** 条件分支配置（type=condition 时使用） */
  branches?: Array<{
    condition: Record<string, unknown>;
    next_node: string;
  }>;
}

export interface LowcodeWorkflow {
  id: string;
  app_id: string;
  /** 工作流编码（应用内唯一） */
  code: string;
  name: string;
  description?: string;
  /** 触发器配置 */
  trigger: {
    type: LowcodeWorkflowTriggerType;
    /** form_submit: 表单 id；schedule: cron 表达式；event: 事件名；webhook: 路径 */
    payload?: Record<string, unknown>;
  };
  /** 节点列表（含连线关系） */
  nodes: LowcodeWorkflowNode[];
  /** 起始节点 id */
  start_node_id?: string;
  status: 'draft' | 'enabled' | 'disabled';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLowcodeWorkflowRequest {
  app_id: string;
  code: string;
  name: string;
  description?: string;
  trigger: LowcodeWorkflow['trigger'];
  nodes?: Array<Omit<LowcodeWorkflowNode, 'id'>>;
  start_node_id?: string;
}

export interface UpdateLowcodeWorkflowRequest {
  name?: string;
  description?: string;
  trigger?: LowcodeWorkflow['trigger'];
  nodes?: Array<Omit<LowcodeWorkflowNode, 'id'>>;
  start_node_id?: string;
  status?: 'draft' | 'enabled' | 'disabled';
}

// ============================================================================
// 仪表盘统计（LowCodeHomePage 用）
// ============================================================================

export interface LowcodeDashboardStats {
  total_apps: number;
  published_apps: number;
  draft_apps: number;
  total_data_models: number;
  total_data_sources: number;
  total_forms: number;
  total_pages: number;
  total_workflows: number;
  /** 最近 7 天活跃应用数 */
  recent_active_apps: number;
}
