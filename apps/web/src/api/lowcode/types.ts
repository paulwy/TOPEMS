export type FieldType =
  | 'string'
  | 'text'
  | 'richText'
  | 'integer'
  | 'float'
  | 'currency'
  | 'percent'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'multiSelect'
  | 'boolean'
  | 'relation'
  | 'multiRelation'
  | 'file'
  | 'image'
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'createdBy'
  | 'updatedBy';

export type RelationType = 'oneToOne' | 'oneToMany' | 'manyToMany' | 'manyToOne';

export interface ModelField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  length?: number;
  precision?: number;
  scale?: number;
  defaultValue?: string | number | boolean | null;
  required?: boolean;
  unique?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  description?: string;
  options?: Array<{ label: string; value: string }>;
  relationModelId?: string;
  relationField?: string;
  relationType?: RelationType;
  isSystem?: boolean;
  order?: number;
}

export interface ModelRelation {
  id: string;
  name: string;
  label?: string;
  type: RelationType;
  modelId?: string;
  sourceModelId: string;
  sourceFieldId: string;
  targetModelId: string;
  targetFieldId: string;
  foreignKey?: string;
  displayField?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataModel {
  id: string;
  name: string;
  label: string;
  description?: string;
  tableName?: string;
  fields: ModelField[];
  relations?: ModelRelation[];
  status: 'draft' | 'published' | 'archived';
  version?: string;
  dataSourceId?: string;
  recordCount?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataPreviewParams {
  modelId: string;
  page?: number;
  pageSize?: number;
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  sort?: { field: string; direction: 'asc' | 'desc' };
}

export interface DataPreviewResult {
  columns: Array<{ key: string; title: string; type: FieldType }>;
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

export type AppStatus = 'draft' | 'developing' | 'testing' | 'published' | 'archived';

export interface AppVersion {
  id: string;
  version: string;
  description?: string;
  status: 'draft' | 'published' | 'deprecated';
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
}

export interface LowCodeApp {
  id: string;
  name: string;
  label?: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  status: AppStatus;
  version?: string;
  currentVersion?: string;
  category?: string;
  modelCount?: number;
  pageCount?: number;
  formCount?: number;
  workflowCount?: number;
  pages?: Array<{ id: string; name: string; path: string; type: string }>;
  forms?: Array<{ id: string; name: string; modelId: string }>;
  dataModels?: string[];
  modelIds?: string[];
  workflows?: string[];
  permissions?: Array<{ roleId: string; permissions: string[] }>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AppPublishParams {
  appId: string;
  version: string;
  description?: string;
  environment?: 'development' | 'testing' | 'production';
}

export type DataSourceType = 'mysql' | 'postgresql' | 'oracle' | 'sqlserver' | 'mongodb' | 'api';

export interface DataSourceConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  apiUrl?: string;
  apiKey?: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  config: DataSourceConfig;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  apiUrl?: string;
  apiKey?: string;
  status: 'active' | 'inactive' | 'error';
  description?: string;
  lastTestAt?: string;
  tables?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TableInfo {
  name: string;
  label?: string;
  comment?: string;
  rowCount?: number;
  rows?: number;
  columns?: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
  isPrimaryKey?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  appId?: string;
  status: 'draft' | 'published' | 'archived';
  version?: string;
  definition?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  roleName?: string;
  appId?: string;
  permissions: string[];
  dataPermissions?: DataPermissionRule[];
  fieldPermissions?: FieldPermissionRule[];
}

export interface DataPermissionRule {
  id: string;
  name: string;
  modelId: string;
  condition: string;
  field?: string;
  operator?: string;
  value?: string;
}

export interface FieldPermissionRule {
  id: string;
  modelId: string;
  fieldId: string;
  roleId: string;
  visible: boolean;
  editable: boolean;
}

export interface ComponentSchema {
  id: string;
  type: string;
  label?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: unknown;
  props?: Record<string, unknown>;
  children?: ComponentSchema[];
  events?: EventAction[];
  style?: Record<string, string | number>;
  layout?: {
    span?: number;
    offset?: number;
  };
}

export interface FormSchema {
  id: string;
  name: string;
  description?: string;
  version?: string;
  components: ComponentSchema[];
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: number;
  size?: 'small' | 'medium' | 'large';
  dataSourceId?: string;
  submitConfig?: {
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    successMessage?: string;
    redirectUrl?: string;
  };
  status: 'draft' | 'published' | 'archived';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageSchema {
  id: string;
  name: string;
  description?: string;
  version?: string;
  components: ComponentSchema[];
  layout?: {
    type?: 'flex' | 'grid' | 'absolute';
    columns?: number;
    gap?: number;
  };
  dataSources?: string[];
  events?: EventAction[];
  style?: Record<string, string | number>;
  status: 'draft' | 'published' | 'archived';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventAction {
  id: string;
  event: string;
  action: string;
  config?: Record<string, unknown>;
}

export interface ComponentCategory {
  id: string;
  name: string;
  icon?: string;
  components: ComponentDefinition[];
}

export interface ComponentDefinition {
  type: string;
  name: string;
  icon?: string;
  category: string;
  description?: string;
  defaultProps?: Record<string, unknown>;
  propSchema?: PropSchema[];
  isContainer?: boolean;
}

export interface PropSchema {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'array' | 'object';
  defaultValue?: unknown;
  options?: Array<{ label: string; value: unknown }>;
  required?: boolean;
  description?: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  category?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateFormRequest {
  name: string;
  description?: string;
  components?: ComponentSchema[];
}

export interface UpdateFormRequest {
  name?: string;
  description?: string;
  components?: ComponentSchema[];
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: number;
  size?: 'small' | 'medium' | 'large';
  status?: 'draft' | 'published' | 'archived';
}

export interface CreatePageRequest {
  name: string;
  description?: string;
  components?: ComponentSchema[];
}

export interface UpdatePageRequest {
  name?: string;
  description?: string;
  components?: ComponentSchema[];
  layout?: {
    type?: 'flex' | 'grid' | 'absolute';
    columns?: number;
    gap?: number;
  };
  status?: 'draft' | 'published' | 'archived';
}

export interface AppOverview {
  totalApps: number;
  totalModels: number;
  totalWorkflows: number;
  totalUsers: number;
  total: number;
  published: number;
  developing: number;
  testing: number;
  draft: number;
  categoryStats?: Record<string, number>;
  recentApps?: LowCodeApp[];
  activityData?: Array<{ date: string; count: number }>;
}
