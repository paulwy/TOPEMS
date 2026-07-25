/**
 * Schema 扩展类型 — 为 EntitySchema 增加嵌套表、树形结构和向导表单支持
 *
 * 这些扩展能力可以在标准 CRUD 之外，应对更复杂的业务场景：
 * - nestedTables：表单内嵌子表（如订单明细、物料列表）
 * - tree：树形结构数据（如组织架构、分类层级）
 * - wizard：多步骤向导表单（如入职流程、审批流程）
 */

import type { SchemaField } from './types';
import type { ColumnDef } from '@/components/templates/list/types';

// ============ 嵌套表配置 ============

/** 嵌套表配置 —— 用于表单中的子表（如订单明细行） */
export interface NestedTableConfig {
  /** 字段名（在父表单数据中存储子表数据的 key） */
  field: string;
  /** 子表显示标题 */
  title?: string;
  /** 子表列定义 */
  columns: ColumnDef[];
  /** 子表字段定义（用于表单渲染） */
  fields?: SchemaField[];
  /** 是否支持新增行，默认 true */
  allowAdd?: boolean;
  /** 是否支持编辑行，默认 true */
  allowEdit?: boolean;
  /** 是否支持删除行，默认 true */
  allowDelete?: boolean;
  /** 是否支持复制行，默认 false */
  allowDuplicate?: boolean;
  /** 新增行按钮文本 */
  addButtonText?: string;
  /** 每行唯一标识字段名，默认 'id' */
  rowKeyField?: string;
  /** 子表最小行数（少于此数时自动填充空行） */
  minRows?: number;
  /** 子表最大行数 */
  maxRows?: number;
  /** 子表单列数，默认 2 */
  formColCount?: number;
  /** 子表是否可折叠 */
  collapsible?: boolean;
  /** 默认是否展开 */
  defaultExpanded?: boolean;
  /** 子表数据校验函数 */
  validate?: (rows: Record<string, unknown>[]) => string | null;
}

// ============ 树形结构配置 ============

/** 树形结构配置 —— 用于层级数据（如组织、分类） */
export interface TreeConfig {
  /** 节点唯一标识字段名，默认 'id' */
  keyField?: string;
  /** 父节点字段名，默认 'parent_id' */
  parentField?: string;
  /** 子节点数组字段名，默认 'children' */
  childrenField?: string;
  /** 节点显示标签字段名 */
  labelField?: string;
  /** 是否支持拖拽排序 */
  draggable?: boolean;
  /** 是否支持展开/折叠 */
  expandable?: boolean;
  /** 默认展开所有节点 */
  defaultExpandAll?: boolean;
  /** 默认展开的节点 ID 列表 */
  defaultExpandedKeys?: Array<string | number>;
  /** 是否支持多选 */
  selectable?: boolean;
  /** 是否支持复选框选择 */
  checkable?: boolean;
  /** 是否级联选中（父选中自动选中子） */
  cascadeCheck?: boolean;
  /** 异步加载子节点函数 */
  loadChildren?: (node: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  /** 是否显示连接线 */
  showLine?: boolean;
  /** 节点图标渲染 */
  renderIcon?: (node: Record<string, unknown>) => React.ReactNode;
  /** 自定义节点标题渲染 */
  renderLabel?: (node: Record<string, unknown>) => React.ReactNode;
}

// ============ 向导表单配置 ============

/** 向导步骤配置 */
export interface WizardStepConfig {
  /** 步骤唯一标识 */
  key: string;
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description?: string;
  /** 该步骤包含的字段名数组 */
  fields: string[];
  /** 步骤分组标题（用于在步骤内再分组） */
  groupTitle?: string;
  /** 是否为最后一步（显示提交按钮） */
  isFinalStep?: boolean;
  /** 步骤前校验（返回错误信息字符串，null 表示通过） */
  validate?: (values: Record<string, unknown>) => string | null;
  /** 步骤标题图标 */
  icon?: React.ReactNode;
  /** 条件可见性：根据当前 values 决定步骤是否显示 */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
  /** 自定义步骤内容渲染（覆盖默认的 FormBuilder 渲染） */
  renderContent?: (props: WizardStepRenderProps) => React.ReactNode;
}

/** 向导步骤自定义渲染 Props */
export interface WizardStepRenderProps {
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  mode: 'create' | 'edit' | 'view';
  disabled?: boolean;
  fieldSchema: SchemaField[];
  nestedTables: NestedTableConfig[];
}

/** 向导表单配置 —— 多步骤流程表单 */
export interface WizardConfig {
  /** 步骤配置数组 */
  steps: WizardStepConfig[];
  /** 向导标题 */
  title?: string;
  /** 步骤导航位置 */
  navigationPosition?: 'top' | 'side';
  /** 是否显示步骤进度条 */
  showProgress?: boolean;
  /** 是否允许跳过步骤 */
  allowSkip?: boolean;
  /** 是否允许返回上一步 */
  allowBack?: boolean;
  /** 完成步骤按钮文本 */
  finishButtonText?: string;
  /** 下一步按钮文本 */
  nextButtonText?: string;
  /** 上一步按钮文本 */
  prevButtonText?: string;
  /** 步骤完成后是否显示摘要 */
  showSummaryOnComplete?: boolean;
  /** 步骤间数据转换 */
  transformStepData?: (
    data: Record<string, unknown>,
    fromStep: string,
    toStep: string
  ) => Record<string, unknown>;
}

// ============ EntitySchema 扩展 ============

/**
 * EntitySchema 扩展 —— 在标准 Schema 之上增加嵌套表/树形/向导能力
 *
 * 使用时将本配置合并到 EntitySchema 中即可：
 * ```ts
 * const schema: EntitySchema & SchemaExtensions = { ... };
 * ```
 */
export interface SchemaExtensions {
  /** 嵌套表配置（表单中的子表） */
  nestedTables?: NestedTableConfig[];
  /** 树形结构配置 */
  tree?: TreeConfig;
  /** 向导表单配置 */
  wizard?: WizardConfig;
}

// ============ 工具函数 ============

/**
 * 从 SchemaField 数组派生 ColumnDef 数组
 *
 * 消除在 NestedTableConfig 中同时定义 columns 与 fields 的重复。
 * 字段的 label 映射为列标题，listWidth 映射为列宽。
 *
 * @example
 * ```ts
 * const table: NestedTableConfig = {
 *   field: 'items',
 *   fields: [
 *     { name: 'code', label: '编码', type: 'text', listWidth: 120 },
 *   ],
 *   columns: columnsFromFields(fields), // 一行派生出 columns
 * };
 * ```
 */
export function columnsFromFields(
  fields: SchemaField[],
  overrides: Record<string, Partial<ColumnDef>> = {}
): ColumnDef[] {
  return fields.map((f) => {
    const override = overrides[f.name];
    return {
      id: f.name,
      label: f.label,
      width: f.listWidth,
      minWidth: f.listMinWidth,
      sortable: f.sortable,
      fixed: f.fixed,
      align: f.align,
      ...(override ?? {}),
    };
  });
}
