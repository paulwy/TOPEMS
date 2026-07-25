/**
 * Schema 层 — 低代码平台的单一数据源
 *
 * 一个 EntitySchema 驱动整个 CRUD 页面：
 * - 列表（列定义、搜索、筛选）
 * - 创建表单
 * - 编辑表单
 * - 详情展示
 */

export type {
  FieldType,
  OptionsSource,
  FieldFormatter,
  SchemaField,
  BadgeColor,
  StatusBadgeConfig,
  ListFilterConfig,
  ListConfig,
  ApiConfig,
  CrudAction,
  RowActionConfig,
  BatchActionConfig,
  FormSectionConfig,
  EntitySchema,
  DynamicOptionConfig,
  ImportConfig,
  ExportConfig,
  DashboardColor,
  IconName,
  StatCardSchema,
  ChartSchema,
  DataTableSchema,
  DashboardSchema,
} from './types';

export { toFormField, toColumnDef, getColumns, getFormFields, getFilterParams } from './types';

// ── Adapter Factory ──
export type {
  CrudApi,
  NormalizedListResponse,
  CrudResult,
  CrudApiAdapterConfig,
  CrudApiAdapter,
} from './adapterFactory';

export { createCrudApiAdapter, normalizeListResponse } from './adapterFactory';

// ── Schema Extensions ──
export type {
  NestedTableConfig,
  TreeConfig,
  WizardStepConfig,
  WizardStepRenderProps,
  WizardConfig,
  SchemaExtensions,
} from './schemaExtensions';

export { columnsFromFields } from './schemaExtensions';
