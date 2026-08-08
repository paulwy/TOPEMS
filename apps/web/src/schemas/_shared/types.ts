/**
 * EntitySchema - Core type system for the low-code platform
 *
 * A Schema describes the complete CRUD configuration for a business entity,
 * driving list pages, create forms, edit forms, and detail views.
 */

import React from 'react';
import { Chip } from '@mui/material';
import type { ColumnDef } from '@/components/templates/list/types';
import type { FormFieldConfig } from '@/components/common/FormBuilder';

// ============ Field Types ============

/** Basic field types (applicable to both forms and lists) */
export type FieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'autocomplete'
  | 'date'
  | 'datetime'
  | 'switch'
  | 'checkbox'
  | 'checkbox-group'
  | 'email';

/** Options source type */
export type OptionsSource =
  | { type: 'static'; options: { value: string | number | boolean; label: string }[] }
  | { type: 'dynamic'; resolver: string }
  | {
      type: 'api';
      loader: () => Promise<{ value: string; label: string }[]>;
    }
  | { value: string | number | boolean; label: string }[];

/** Dynamic option configuration */
export interface DynamicOptionConfig {
  /** Field name, corresponds to SchemaField.name */
  field: string;
  /** Function to load options, accepts optional dependency values */
  loader: (deps?: Record<string, unknown>) => Promise<{ value: string; label: string }[]>;
  /** React Query queryKey for cache and invalidation */
  queryKey?: string[];
  /** Dependencies (auto-reload when dependencies change) */
  dependencies?: string[];
}

/** Field-level formatter */
export type FieldFormatter = (
  value: unknown,
  row: Record<string, unknown>
) => string | React.ReactNode;

// ============ SchemaField ============

/**
 * Schema field definition - unified description of a field`s form and list behavior
 *
 * A single field drives:
 * - FormBuilder`s FormFieldConfig (form rendering)
 * - DataTable`s ColumnDef (list rendering)
 * - DetailViewer`s field display (detail rendering)
 */
export interface SchemaField {
  /** Field name (key in data object) */
  name: string;
  /** Display label */
  label: string;

  // ── Type ──
  /** Field type */
  type: FieldType;

  // ── Form Behavior ──
  /** Whether required */
  required?: boolean;
  /** Default value */
  defaultValue?: unknown;
  /** Placeholder */
  placeholder?: string;
  /** Options (for select/autocomplete) */
  options?: OptionsSource;
  /** Validation rules */
  validation?: Array<{ type: string; value?: number | string | RegExp; message?: string }>;
  /** Field linkage: other field names this depends on */
  dependsOn?: string[];
  /** Conditional visibility */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
  /** Column span in form (colSpan=2 takes full row) */
  colSpan?: number;

  // ── Form Behavior (Extended) ──
  /** Whether hidden in form */
  hideInForm?: boolean;
  /** Whether shown in form */
  showInForm?: boolean;

  // ── Permission Control ──
  /** Read-only in edit mode (e.g. code field cannot be changed after creation) */
  readonlyOnEdit?: boolean;
  /** Always read-only */
  readonly?: boolean;

  // ── List Behavior ──
  /** Whether shown in list, defaults to true */
  showInList?: boolean;
  /** Whether hidden in list (semantic alias equivalent to showInList=false) */
  hideInList?: boolean;
  /** List column width */
  listWidth?: number | string;
  /** Minimum width in list */
  listMinWidth?: number;
  /** List column minimum width (semantic alias for listMinWidth) */
  minWidth?: number;
  /** Whether sortable */
  sortable?: boolean;
  /** Fixed column position in list */
  fixed?: 'left' | 'right';
  /** Alignment in list */
  align?: 'left' | 'right' | 'center';
  /** Custom cell rendering */
  renderCell?:
    | ((row: Record<string, unknown>, index: number) => React.ReactNode)
    | ((value: unknown) => string | React.ReactNode)
    | ((value: number) => string)
    | ((row: Record<string, unknown>) => React.ReactNode);
  /** Whether inline editable in list (requires list-level inlineEditable enabled) */
  tableEditable?: boolean;

  // ── Detail Behavior ──
  /** Whether shown in detail, defaults to true */
  showInDetail?: boolean;
  /** Custom formatter in detail */
  format?: FieldFormatter;

  // ── Filtering ──
  /** Whether used as filter */
  filterable?: boolean;

  // ── Form Control Extension ──
  /** Number of rows for textarea */
  rows?: number;
}

// ============ Batch Action Config ============

/** Batch action configuration */
export interface BatchActionConfig {
  key: string;
  label: string;
  /** Action icon */
  icon?: React.ReactNode;
  /** Action color */
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** Click callback (selectedIds is array of selected row IDs) */
  onClick: (selectedIds: string[]) => void;
  /** Whether confirmation is needed */
  confirm?: boolean;
  /** Confirmation message */
  confirmMessage?: string;
  /** Action description */
  description?: string;
}

// ============ Import/Export Config ============

/** Import configuration */
export interface ImportConfig {
  /** Whether import is enabled */
  enabled: boolean;
  /** Import function (accepts File object) */
  onImport: (file: File) => Promise<void>;
  /** Supported file types */
  accept?: string;
  /** Template download URL */
  templateUrl?: string;
}

/** Export configuration */
export interface ExportConfig {
  /** Whether export is enabled */
  enabled: boolean;
  /** Export function */
  onExport: () => Promise<void>;
  /** Export file name */
  fileName?: string;
  /** Supported formats */
  formats?: string[];
}

// ============ Form Section Config ============

/** Form group configuration */
export interface FormSectionConfig {
  title: string;
  /** Field names included in this group */
  fields: string[];
}

// ============ List Config ============

/** Status badge colors (aligned with MUI Chip color) */
export type BadgeColor =
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

/** Status badge configuration */
export interface StatusBadgeConfig {
  /** Status field name */
  field: string;
  /** Value -> color mapping */
  colorMap: Record<string, BadgeColor>;
  /** Value -> label mapping */
  labelMap: Record<string, string>;
}

/** List filter configuration */
export interface ListFilterConfig {
  id: string;
  label: string;
  type: 'select' | 'date-range';
  options?: { label: string; value: string }[];
  /** Corresponding query parameter name, defaults to id */
  paramName?: string;
  /** Default value */
  defaultValue?: string;
}

/** List configuration */
export interface ListConfig {
  /** Column order (field name array), if not specified follows fields order */
  columns?: string[];
  /** Search field name array */
  searchFields?: string[];
  /** Filter configuration */
  filters?: ListFilterConfig[];
  /** Status badge configuration */
  statusBadge?: StatusBadgeConfig;
  /** Default sort field */
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  /** Whether card view is supported */
  enableCardView?: boolean;
  /** Default page size */
  pageSize?: number;
  /** Whether multi-select is supported */
  selectable?: boolean;
  /** Whether inline editing is enabled */
  inlineEditable?: boolean;
  /** Inline edit mode: cell level / row level */
  inlineEditMode?: 'cell' | 'row';
}

// ============ API Config ============

/** API endpoint configuration */
export interface ApiConfig {
  /** API module name (corresponds to directory under src/api/) */
  module: string;
  /** Resource name (corresponds to method prefix on API object) */
  resource: string;
  /** Custom list query function name (default 'list') */
  listMethod?: string;
  /** Custom create function name (default 'create') */
  createMethod?: string;
  /** Custom update function name (default 'update') */
  updateMethod?: string;
  /** Custom delete function name (default 'delete') */
  deleteMethod?: string;
  /** Custom get-by-id function name (default 'getById') */
  getMethod?: string;
}

// ============ Action Config ============

/** CRUD action type */
export type CrudAction = 'create' | 'edit' | 'delete' | 'detail';

/** Row action configuration */
export interface RowActionConfig {
  key: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** Click callback (row is current row data) */
  onClick: (row: Record<string, unknown>) => void;
  /** Whether to display */
  show?: (row: Record<string, unknown>) => boolean;
}

// ============ EntitySchema ============

/**
 * Entity Schema - Core configuration for the low-code platform
 *
 * @example
 * ```ts
 * const inboundOrderSchema: EntitySchema = {
 *   entity: 'inbound_order',
 *   title: 'Inbound Order',
 *   api: { module: 'wms', resource: 'inboundOrders' },
 *   fields: [
 *     { name: 'order_number', label: 'Order Number', type: 'text', required: true, readonlyOnEdit: true,
  validation: [
    { type: 'maxLength', value: 100 },
  ],
},
 *     { name: 'order_type', label: 'Order Type', type: 'select', options: { type: 'static', options: [...] },
  validation: [
    { type: 'maxLength', value: 50 },
  ],
},
 *     { name: 'expected_date', label: 'Expected Date', type: 'date' },
 *   ],
 *   list: {
 *     searchFields: ['order_number', 'supplier_name'],
 *     statusBadge: { field: 'status', colorMap: { pending: 'warning', completed: 'success' } },
 *   },
 *   actions: ['create', 'edit', 'detail', 'delete'],
 * };
 * ```
 */
export interface EntitySchema<T = Record<string, unknown>> {
  /** Entity identifier (unique) */
  entity: string;
  /** Entity display name */
  title: string;
  /** Entity description */
  description?: string;

  /** API configuration (optional, supports local data or custom apiAdapter) */
  api?: ApiConfig;

  /** Field definitions */
  fields: SchemaField[];

  /** List configuration */
  list?: ListConfig;

  /** Supported CRUD operations */
  actions?: CrudAction[];

  /** Custom row actions */
  customRowActions?: RowActionConfig[];

  /** Batch action configuration */
  batchActions?: BatchActionConfig[];

  /** Form group configuration */
  formSections?: FormSectionConfig[];

  /** Form column count, default 2 */
  formColCount?: number;

  /** Create dialog title (default 'Create {title}') */
  createTitle?: string;
  /** Edit dialog title (default 'Edit {title}') */
  editTitle?: string;
  /** Detail dialog title (default '{title} Detail') */
  detailTitle?: string;
  /** Detail dialog max width (aligned with MUI Dialog maxWidth) */
  detailMaxWidth?: 'sm' | 'md' | 'lg' | 'xl';

  /** Dynamic option configuration (API-loaded select/autocomplete options) */
  dynamicOptions?: DynamicOptionConfig[];

  /** Import configuration */
  importConfig?: ImportConfig;

  /** Export configuration */
  exportConfig?: ExportConfig;

  /** Custom detail rendering (overrides default FormBuilder view mode) */
  renderDetail?: (row: T) => React.ReactNode;

  /** Custom header content (stat cards etc.). Supports render function receiving data and total count */
  headerContent?: React.ReactNode | ((rows: T[], total: number) => React.ReactNode);

  /** Whether read-only mode (disables all edit operations) */
  readonly?: boolean;
}

// ============ Conversion Utilities ============

/**
 * Convert SchemaField to FormBuilder`s FormFieldConfig
 */
export function toFormField(field: SchemaField, mode: 'create' | 'edit' | 'view'): FormFieldConfig {
  const isReadonly = field.readonly || (mode === 'edit' && field.readonlyOnEdit) || mode === 'view';

  let options: { value: string; label: string }[] | undefined;
  if (field.options) {
    if (Array.isArray(field.options)) {
      options = field.options.map((o) => ({
        value: String(o.value),
        label: o.label,
      }));
    } else if (field.options.type === 'static') {
      options = field.options.options.map((o) => ({
        value: String(o.value),
        label: o.label,
      }));
    }
  }

  return {
    name: field.name,
    label: field.label,
    type: field.type,
    required: mode !== 'view' ? field.required : false,
    placeholder: field.placeholder,
    defaultValue: field.defaultValue,
    disabled: isReadonly,
    options,
    validation: field.validation as FormFieldConfig['validation'],
    colSpan: field.colSpan,
    dependsOn: field.dependsOn,
    visible: field.visibleWhen,
  };
}

/**
 * Convert SchemaField to DataTable`s ColumnDef
 */
export function toColumnDef(field: SchemaField): ColumnDef | null {
  if (field.showInList === false) return null;

  let render;
  if (field.renderCell) {
    render = (row: Record<string, unknown>, index: number) => {
      const fnLength = field.renderCell!.length;
      if (fnLength >= 2) {
        const renderWithRow = field.renderCell as (
          row: Record<string, unknown>,
          index: number
        ) => React.ReactNode;
        return renderWithRow(row, index);
      } else if (fnLength === 1) {
        const value = row[field.name];
        return (field.renderCell as (value: unknown) => string | React.ReactNode)(value);
      } else {
        const renderWithRowOnly = field.renderCell as (
          row: Record<string, unknown>
        ) => React.ReactNode;
        return renderWithRowOnly(row);
      }
    };
  }

  // Inline edit configuration
  const inlineEdit = field.tableEditable
    ? (() => {
        const editTypeMap: Record<
          FieldType,
          'text' | 'select' | 'number' | 'date' | 'datetime' | 'checkbox'
        > = {
          text: 'text',
          number: 'number',
          textarea: 'text',
          select: 'select',
          autocomplete: 'select',
          date: 'date',
          datetime: 'datetime',
          switch: 'checkbox',
          checkbox: 'checkbox',
          'checkbox-group': 'select',
          email: 'text',
        };

        const editType = editTypeMap[field.type] ?? 'text';
        const options = field.options
          ? (() => {
              if (Array.isArray(field.options)) {
                return field.options.map((opt) => ({
                  value: String(opt.value) as string | number,
                  label: opt.label,
                }));
              }
              if (field.options.type === 'static') {
                return field.options.options.map((opt) => ({
                  value: String(opt.value) as string | number,
                  label: opt.label,
                }));
              }
              return;
            })()
          : undefined;

        return {
          type: editType,
          options,
        };
      })()
    : undefined;

  return {
    id: field.name,
    label: field.label,
    width: field.listWidth,
    minWidth: field.listMinWidth,
    editable: field.tableEditable,
    sortable: field.sortable,
    fixed: field.fixed,
    render,
    inlineEdit,
  };
}

/**
 * Extract list column definitions from Schema (with status badge)
 */
export function getColumns<T = Record<string, unknown>>(schema: EntitySchema<T>): ColumnDef[] {
  const fieldMap = new Map(schema.fields.map((f) => [f.name, f]));
  const order = schema.list?.columns || schema.fields.map((f) => f.name);
  const statusBadge = schema.list?.statusBadge;

  return order
    .map((name) => fieldMap.get(name))
    .filter((f): f is SchemaField => !!f)
    .map((field) => {
      const col = toColumnDef(field);
      if (!col) return null;

      if (statusBadge && field.name === statusBadge.field && !field.renderCell) {
        col.render = (row: Record<string, unknown>) => {
          const value = String(row[field.name] ?? '');
          const label = statusBadge.labelMap[value] || value;
          const color = (statusBadge.colorMap[value] || 'default') as string;
          return React.createElement(Chip, {
            label,
            size: 'small',
            color: (color === 'default' ? 'default' : color) as
              'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning',
            variant: color === 'default' ? 'outlined' : 'filled',
          });
        };
      }

      return col;
    })
    .filter((c): c is ColumnDef => c !== null);
}

/**
 * Extract form field configuration from Schema
 */
export function getFormFields<T = Record<string, unknown>>(
  schema: EntitySchema<T>,
  mode: 'create' | 'edit' | 'view'
): FormFieldConfig[] {
  const showInDetail = mode === 'view';
  return schema.fields
    .filter((f) => (showInDetail ? f.showInDetail !== false : true))
    .map((f) => toFormField(f, mode));
}

/**
 * Extract filter parameters from Schema
 */
export function getFilterParams<T = Record<string, unknown>>(
  schema: EntitySchema<T>,
  filterValues: Record<string, string>
): Record<string, string> {
  const params: Record<string, string> = {};
  const filters = schema.list?.filters;
  if (!filters) return params;

  for (const filter of filters) {
    const value = filterValues[filter.id];
    if (value && value !== 'all') {
      params[filter.paramName || filter.id] = value;
    }
  }
  return params;
}

// ============ Dashboard Schema ============

/** Dashboard theme color */
export type DashboardColor = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';

/** Built-in icon names */
export type IconName =
  | 'FileText'
  | 'TrendingUp'
  | 'TrendingDown'
  | 'DollarSign'
  | 'BarChart3'
  | 'Target'
  | 'CreditCard'
  | 'Calculator'
  | 'Building'
  | 'Users'
  | 'Package'
  | 'Warehouse'
  | 'ClipboardList'
  | 'CheckCircle'
  | 'AlertCircle'
  | 'Clock'
  | 'Activity';

/** Dashboard stat card schema */
export interface StatCardSchema {
  id: string;
  title: string;
  value: string | number | (() => string | number);
  icon?: IconName | React.ReactNode;
  color?: DashboardColor;
  trend?: { value: number; label?: string };
}

/** Dashboard chart schema */
export interface ChartSchema {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  data: unknown | (() => Promise<unknown>);
  height?: number;
}

/** Dashboard data table schema */
export interface DataTableSchema {
  title: string;
  data: Array<Record<string, unknown>> | (() => Promise<Array<Record<string, unknown>>>);
  entitySchema?: EntitySchema;
  searchable?: boolean;
}

/** Dashboard schema */
export interface DashboardSchema {
  title: string;
  description?: string;
  statCards?: StatCardSchema[];
  charts?: ChartSchema[];
  table?: DataTableSchema;
  loader?: () => Promise<{
    statCards?: Record<string, unknown>;
    charts?: Record<string, unknown>;
    table?: Array<Record<string, unknown>>;
  }>;
}
