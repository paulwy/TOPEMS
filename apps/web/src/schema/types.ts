/**
 * EntitySchema — 低代码平台核心类型系统
 *
 * 一个 Schema 描述一个业务实体的完整 CRUD 配置，
 * 驱动列表页、创建表单、编辑表单、详情展示。
 */

import React from 'react';
import { Chip } from '@mui/material';
import type { ColumnDef } from '@/components/templates/list/types';
import type { FormFieldConfig } from '@/components/common/FormBuilder';

// ============ 字段类型 ============

/** 字段基础类型（同时适用于表单和列表） */
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

/** 选项来源类型 */
export type OptionsSource =
  | { type: 'static'; options: { value: string | number | boolean; label: string }[] }
  | { type: 'dynamic'; resolver: string }
  | {
      type: 'api';
      loader: () => Promise<{ value: string; label: string }[]>;
    }
  | { value: string | number | boolean; label: string }[];

/** 动态选项配置 */
export interface DynamicOptionConfig {
  /** 字段名，与 SchemaField.name 对应 */
  field: string;
  /** 加载选项的函数，接收可选的依赖值 */
  loader: (deps?: Record<string, unknown>) => Promise<{ value: string; label: string }[]>;
  /** React Query queryKey，用于缓存和失效 */
  queryKey?: string[];
  /** 依赖项（依赖变化时自动重新加载） */
  dependencies?: string[];
}

/** 字段级格式化器 */
export type FieldFormatter = (
  value: unknown,
  row: Record<string, unknown>
) => string | React.ReactNode;

// ============ SchemaField ============

/**
 * Schema 字段定义 — 统一描述一个字段的表单和列表行为
 *
 * 一个 field 同时驱动：
 * - FormBuilder 的 FormFieldConfig（表单渲染）
 * - DataTable 的 ColumnDef（列表渲染）
 * - DetailViewer 的字段展示（详情渲染）
 */
export interface SchemaField {
  /** 字段名（数据对象中的 key） */
  name: string;
  /** 显示标签 */
  label: string;

  // ── 类型 ──
  /** 字段类型 */
  type: FieldType;

  // ── 表单行为 ──
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: unknown;
  /** 占位符 */
  placeholder?: string;
  /** 选项（select/autocomplete 用） */
  options?: OptionsSource;
  /** 校验规则 */
  validation?: Array<{ type: string; value?: number | string | RegExp; message?: string }>;
  /** 字段联动：依赖的其他字段名 */
  dependsOn?: string[];
  /** 条件可见 */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
  /** 表单中跨列数（colSpan=2 占整行） */
  colSpan?: number;

  // ── 表单行为（扩展） ──
  /** 是否在表单中隐藏 */
  hideInForm?: boolean;
  /** 是否在表单中显示 */
  showInForm?: boolean;

  // ── 权限控制 ──
  /** 在编辑模式下是否只读（如 code 字段创建后不可改） */
  readonlyOnEdit?: boolean;
  /** 始终只读 */
  readonly?: boolean;

  // ── 列表行为 ──
  /** 是否在列表中显示，默认 true */
  showInList?: boolean;
  /** 是否在列表中隐藏（与 showInList=false 等效的语义别名） */
  hideInList?: boolean;
  /** 列表列宽 */
  listWidth?: number | string;
  /** 列表中最小宽度 */
  listMinWidth?: number;
  /** 列表列最小宽度（listMinWidth 的语义别名） */
  minWidth?: number;
  /** 是否可排序 */
  sortable?: boolean;
  /** 列表中固定列位置 */
  fixed?: 'left' | 'right';
  /** 列表中对齐方式 */
  align?: 'left' | 'right' | 'center';
  /** 自定义单元格渲染 */
  renderCell?:
    | ((row: Record<string, unknown>, index: number) => React.ReactNode)
    | ((value: unknown) => string | React.ReactNode)
    | ((value: number) => string)
    | ((row: Record<string, unknown>) => React.ReactNode);
  /** 列表中是否可内联编辑（需列表级 inlineEditable 同时启用） */
  tableEditable?: boolean;

  // ── 详情行为 ──
  /** 是否在详情中显示，默认 true */
  showInDetail?: boolean;
  /** 详情中的自定义格式化 */
  format?: FieldFormatter;

  // ── 筛选 ──
  /** 是否作为筛选项 */
  filterable?: boolean;

  // ── 表单控件扩展 ──
  /** textarea 行数 */
  rows?: number;
}

// ============ 批量操作配置 ============

/** 批量操作配置 */
export interface BatchActionConfig {
  key: string;
  label: string;
  /** 操作图标 */
  icon?: React.ReactNode;
  /** 操作颜色 */
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** 点击回调（selectedIds 为选中行的 ID 数组） */
  onClick: (selectedIds: string[]) => void;
  /** 是否需要确认 */
  confirm?: boolean;
  /** 确认消息 */
  confirmMessage?: string;
  /** 操作描述 */
  description?: string;
}

// ============ 导入导出配置 ============

/** 导入配置 */
export interface ImportConfig {
  /** 是否启用导入 */
  enabled: boolean;
  /** 导入函数（接受 File 对象） */
  onImport: (file: File) => Promise<void>;
  /** 支持的文件类型 */
  accept?: string;
  /** 模板下载 URL */
  templateUrl?: string;
}

/** 导出配置 */
export interface ExportConfig {
  /** 是否启用导出 */
  enabled: boolean;
  /** 导出函数 */
  onExport: () => Promise<void>;
  /** 导出文件名 */
  fileName?: string;
  /** 支持的格式 */
  formats?: string[];
}

// ============ 表单分组配置 ============

/** 表单分组配置 */
export interface FormSectionConfig {
  title: string;
  /** 分组包含的字段名 */
  fields: string[];
}

// ============ 列表配置 ============

/** 状态徽章颜色（与 MUI Chip color 对齐） */
export type BadgeColor =
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

/** 状态徽章配置 */
export interface StatusBadgeConfig {
  /** 状态字段名 */
  field: string;
  /** 值 -> 颜色映射 */
  colorMap: Record<string, BadgeColor>;
  /** 值 -> 标签映射 */
  labelMap: Record<string, string>;
}

/** 列表筛选配置 */
export interface ListFilterConfig {
  id: string;
  label: string;
  type: 'select' | 'date-range';
  options?: { label: string; value: string }[];
  /** 对应的查询参数名，默认与 id 相同 */
  paramName?: string;
  /** 默认值 */
  defaultValue?: string;
}

/** 列表配置 */
export interface ListConfig {
  /** 列顺序（field name 数组），未指定则按 fields 顺序 */
  columns?: string[];
  /** 搜索字段名数组 */
  searchFields?: string[];
  /** 筛选项配置 */
  filters?: ListFilterConfig[];
  /** 状态徽章配置 */
  statusBadge?: StatusBadgeConfig;
  /** 默认排序字段 */
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  /** 是否支持卡片视图 */
  enableCardView?: boolean;
  /** 每页默认条数 */
  pageSize?: number;
  /** 是否支持多选 */
  selectable?: boolean;
  /** 是否启用行内编辑 */
  inlineEditable?: boolean;
  /** 行内编辑模式：cell 单元格级别 / row 整行级别 */
  inlineEditMode?: 'cell' | 'row';
}

// ============ API 配置 ============

/** API 端点配置 */
export interface ApiConfig {
  /** API 模块名（对应 src/api/ 下的目录） */
  module: string;
  /** 资源名（对应 API 对象上的方法前缀） */
  resource: string;
  /** 自定义列表查询函数名（默认 'list'） */
  listMethod?: string;
  /** 自定义创建函数名（默认 'create'） */
  createMethod?: string;
  /** 自定义更新函数名（默认 'update'） */
  updateMethod?: string;
  /** 自定义删除函数名（默认 'delete'） */
  deleteMethod?: string;
  /** 自定义详情函数名（默认 'getById'） */
  getMethod?: string;
}

// ============ 操作配置 ============

/** CRUD 操作类型 */
export type CrudAction = 'create' | 'edit' | 'delete' | 'detail';

/** 行操作配置 */
export interface RowActionConfig {
  key: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** 点击回调（row 为当前行数据） */
  onClick: (row: Record<string, unknown>) => void;
  /** 是否显示 */
  show?: (row: Record<string, unknown>) => boolean;
}

// ============ EntitySchema ============

/**
 * 实体 Schema — 低代码平台的核心配置
 *
 * @example
 * ```ts
 * const inboundOrderSchema: EntitySchema = {
 *   entity: 'inbound_order',
 *   title: '入库订单',
 *   api: { module: 'wms', resource: 'inboundOrders' },
 *   fields: [
 *     { name: 'order_number', label: '订单编号', type: 'text', required: true, readonlyOnEdit: true },
 *     { name: 'order_type', label: '订单类型', type: 'select', options: { type: 'static', options: [...] } },
 *     { name: 'expected_date', label: '预计日期', type: 'date' },
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
  /** 实体标识（唯一） */
  entity: string;
  /** 实体显示名称 */
  title: string;
  /** 实体描述 */
  description?: string;

  /** API 配置（可选，支持本地数据或自定义 apiAdapter） */
  api?: ApiConfig;

  /** 字段定义 */
  fields: SchemaField[];

  /** 列表配置 */
  list?: ListConfig;

  /** 支持的 CRUD 操作 */
  actions?: CrudAction[];

  /** 自定义行操作 */
  customRowActions?: RowActionConfig[];

  /** 批量操作配置 */
  batchActions?: BatchActionConfig[];

  /** 表单分组配置 */
  formSections?: FormSectionConfig[];

  /** 表单列数，默认 2 */
  formColCount?: number;

  /** 创建弹窗标题（默认 '新建{title}'） */
  createTitle?: string;
  /** 编辑弹窗标题（默认 '编辑{title}'） */
  editTitle?: string;
  /** 详情弹窗标题（默认 '{title}详情'） */
  detailTitle?: string;
  /** 详情弹窗最大宽度（对齐 MUI Dialog maxWidth） */
  detailMaxWidth?: 'sm' | 'md' | 'lg' | 'xl';

  /** 动态选项配置（API 加载的 select/autocomplete 选项） */
  dynamicOptions?: DynamicOptionConfig[];

  /** 导入配置 */
  importConfig?: ImportConfig;

  /** 导出配置 */
  exportConfig?: ExportConfig;

  /** 自定义详情渲染（覆盖默认 FormBuilder view 模式） */
  renderDetail?: (row: T) => React.ReactNode;

  /** 自定义头部内容（统计卡片等）。支持渲染函数接收数据和总数 */
  headerContent?: React.ReactNode | ((rows: T[], total: number) => React.ReactNode);

  /** 是否只读模式（禁用所有编辑操作） */
  readonly?: boolean;

  /** 是否启用软删除（deleted_at TIMESTAMP）。启用后 delete 操作变为 UPDATE SET deleted_at = NOW() */
  softDelete?: boolean;
}

// ============ 转换工具 ============

/**
 * 将 SchemaField 转换为 FormBuilder 的 FormFieldConfig
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
 * 将 SchemaField 转换为 DataTable 的 ColumnDef
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

  // 行内编辑配置
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
 * 从 Schema 中提取列表列定义（含状态徽章）
 */
export function getColumns<T = Record<string, unknown>>(schema: EntitySchema<T>): ColumnDef<T>[] {
  const fieldMap = new Map(schema.fields.map((f) => [f.name, f]));
  const order = schema.list?.columns || schema.fields.map((f) => f.name);
  const statusBadge = schema.list?.statusBadge;

  return order
    .map((name) => fieldMap.get(name))
    .filter((f): f is SchemaField => !!f)
    .map((field) => {
      const col = toColumnDef(field) as ColumnDef<T>;
      if (!col) return null;

      if (statusBadge && field.name === statusBadge.field && !field.renderCell) {
        col.render = (row: T) => {
          const value = String((row as Record<string, unknown>)[field.name] ?? '');
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
    .filter((c): c is ColumnDef<T> => c !== null);
}

/**
 * 从 Schema 中提取表单字段配置
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
 * 从 Schema 中提取筛选参数
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

/** Dashboard 主题色 */
export type DashboardColor = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';

/** 内置图标名 */
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

/** Dashboard 统计卡片 Schema */
export interface StatCardSchema {
  id: string;
  title: string;
  value: string | number | (() => string | number);
  icon?: IconName | React.ReactNode;
  color?: DashboardColor;
  trend?: { value: number; label?: string };
}

/** Dashboard 图表 Schema */
export interface ChartSchema {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  data: unknown | (() => Promise<unknown>);
  height?: number;
}

/** Dashboard 数据表格 Schema */
export interface DataTableSchema {
  title: string;
  data: Array<Record<string, unknown>> | (() => Promise<Array<Record<string, unknown>>>);
  entitySchema?: EntitySchema;
  searchable?: boolean;
}

/** Dashboard Schema */
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
