/**
 * Schemas shared layer - type definitions and utility functions
 *
 * Includes:
 * - Core type system (EntitySchema, SchemaField, etc.)
 * - CRUD API adapter factory
 * - CrudPage adapter
 * - Schema extensions (nested tables, tree structures, wizard forms)
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

// ── CrudPage Adapter ──
export { createCrudPageAdapter } from './crudPageAdapter';
export type { CrudApi as CrudPageApi } from './crudPageAdapter';

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
