/**
 * 页面设计器类型系统 — 可视化 Schema 构建
 *
 * 定义页面设计器的组件库、画布、属性面板等核心类型。
 * 支持拖拽式页面构建，输出 EntitySchema 配置。
 */

import type React from 'react';
import type { EntitySchema, SchemaField } from '@/schema';

// ============ 设计器组件 ============

/** 设计器组件分类 */
export type ComponentCategory =
  | 'layout' // 布局容器
  | 'form' // 表单控件
  | 'display' // 展示组件
  | 'action' // 操作按钮
  | 'chart' // 图表
  | 'custom'; // 自定义

/** 设计器组件元数据 */
export interface DesignerComponent {
  /** 组件类型唯一标识 */
  type: string;
  /** 显示名称 */
  label: string;
  /** 分类 */
  category: ComponentCategory;
  /** 图标（lucide 图标名） */
  icon?: string;
  /** 组件描述 */
  description?: string;
  /** 是否可作为容器（可拖入子组件） */
  isContainer?: boolean;
  /** 默认属性 */
  defaultProps?: Record<string, unknown>;
  /** 属性面板配置 */
  propsPanel?: PropertyPanelConfig[];
  /** 渲染预览（设计器中显示） */
  renderPreview?: (props: Record<string, unknown>) => React.ReactNode;
  /** 渲染实际组件 */
  render?: (props: Record<string, unknown>) => React.ReactNode;
}

// ============ 属性面板 ============

/** 属性面板配置类型 */
export type PropertyType =
  'text' | 'number' | 'boolean' | 'select' | 'color' | 'icon' | 'textarea' | 'code';

/** 属性面板配置 */
export interface PropertyPanelConfig {
  /** 属性键名 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 属性类型 */
  type: PropertyType;
  /** 默认值 */
  defaultValue?: unknown;
  /** 下拉选项（type='select' 时使用） */
  options?: { value: string; label: string }[];
  /** 描述/提示 */
  description?: string;
  /** 是否必填 */
  required?: boolean;
  /** 是否高级属性（折叠显示） */
  advanced?: boolean;
  /** 校验规则 */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// ============ 画布与节点 ============

/** 画布节点（设计器中的组件实例） */
export interface CanvasNode {
  /** 节点唯一 ID */
  id: string;
  /** 组件类型 */
  type: string;
  /** 节点标签（显示在组件树） */
  label: string;
  /** 组件属性 */
  props: Record<string, unknown>;
  /** 子节点（容器组件） */
  children?: CanvasNode[];
  /** 父节点 ID */
  parentId?: string;
  /** 是否选中 */
  selected?: boolean;
  /** 是否折叠（组件树中） */
  collapsed?: boolean;
}

/** 画布状态 */
export interface CanvasState {
  /** 根节点列表 */
  nodes: CanvasNode[];
  /** 当前选中节点 ID */
  selectedNodeId: string | null;
  /** 当前拖拽的组件类型 */
  draggingType: string | null;
  /** 历史记录（撤销/重做） */
  history: CanvasNode[][];
  /** 当前历史索引 */
  historyIndex: number;
}

// ============ Schema 转换 ============

/** 页面设计器输出配置 */
export interface PageDesignerOutput {
  /** 生成的 EntitySchema */
  schema: EntitySchema;
  /** 画布节点（用于二次编辑） */
  canvas: CanvasNode[];
  /** 版本 */
  version: string;
}

/**
 * 从 SchemaField 列表生成画布节点
 *
 * @example
 * const nodes = schemaToCanvasNodes(warehouseSchema.fields);
 */
export function schemaToCanvasNodes(fields: SchemaField[]): CanvasNode[] {
  return fields.map((field, index) => ({
    id: `field-${field.name}-${index}`,
    type: `form-${field.type}`,
    label: field.label,
    props: {
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder,
      defaultValue: field.defaultValue,
      colSpan: field.colSpan,
    },
    children: [],
  }));
}

/**
 * 从画布节点提取 SchemaField 列表
 *
 * @example
 * const fields = canvasNodesToSchema(nodes);
 */
export function canvasNodesToSchema(nodes: CanvasNode[]): SchemaField[] {
  return nodes
    .filter((node) => node.type.startsWith('form-'))
    .map((node) => {
      const props = node.props;
      return {
        name: String(props.name ?? ''),
        label: String(props.label ?? node.label),
        type: String(props.type ?? 'text') as SchemaField['type'],
        required: Boolean(props.required),
        placeholder: props.placeholder as string | undefined,
        defaultValue: props.defaultValue as SchemaField['defaultValue'],
        colSpan: props.colSpan as number | undefined,
      } as SchemaField;
    });
}

// ============ 设计器组件库 ============

/** 内置表单组件类型 */
export const FORM_COMPONENTS: DesignerComponent[] = [
  {
    type: 'form-text',
    label: '文本输入',
    category: 'form',
    icon: 'Type',
    description: '单行文本输入框',
    defaultProps: { type: 'text', required: false, colSpan: 1 },
    propsPanel: [
      { key: 'name', label: '字段名', type: 'text', required: true, description: '数据库字段名' },
      { key: 'label', label: '标签', type: 'text', required: true },
      { key: 'placeholder', label: '占位符', type: 'text' },
      { key: 'required', label: '必填', type: 'boolean', defaultValue: false },
      {
        key: 'colSpan',
        label: '跨列数',
        type: 'number',
        defaultValue: 1,
        validation: { min: 1, max: 4 },
      },
      { key: 'defaultValue', label: '默认值', type: 'text', advanced: true },
    ],
  },
  {
    type: 'form-number',
    label: '数字输入',
    category: 'form',
    icon: 'Hash',
    description: '数字输入框',
    defaultProps: { type: 'number', required: false, colSpan: 1 },
    propsPanel: [
      { key: 'name', label: '字段名', type: 'text', required: true },
      { key: 'label', label: '标签', type: 'text', required: true },
      { key: 'required', label: '必填', type: 'boolean', defaultValue: false },
      {
        key: 'colSpan',
        label: '跨列数',
        type: 'number',
        defaultValue: 1,
        validation: { min: 1, max: 4 },
      },
      { key: 'min', label: '最小值', type: 'number', advanced: true },
      { key: 'max', label: '最大值', type: 'number', advanced: true },
    ],
  },
  {
    type: 'form-select',
    label: '下拉选择',
    category: 'form',
    icon: 'ChevronDown',
    description: '下拉选择框（支持静态/动态选项）',
    defaultProps: { type: 'select', required: false, colSpan: 1 },
    propsPanel: [
      { key: 'name', label: '字段名', type: 'text', required: true },
      { key: 'label', label: '标签', type: 'text', required: true },
      { key: 'required', label: '必填', type: 'boolean', defaultValue: false },
      {
        key: 'colSpan',
        label: '跨列数',
        type: 'number',
        defaultValue: 1,
        validation: { min: 1, max: 4 },
      },
      {
        key: 'optionsSource',
        label: '选项来源',
        type: 'select',
        defaultValue: 'static',
        options: [
          { value: 'static', label: '静态选项' },
          { value: 'dynamic', label: '动态选项（API）' },
        ],
        advanced: true,
      },
    ],
  },
  {
    type: 'form-date',
    label: '日期选择',
    category: 'form',
    icon: 'Calendar',
    description: '日期选择器',
    defaultProps: { type: 'date', required: false, colSpan: 1 },
    propsPanel: [
      { key: 'name', label: '字段名', type: 'text', required: true },
      { key: 'label', label: '标签', type: 'text', required: true },
      { key: 'required', label: '必填', type: 'boolean', defaultValue: false },
      {
        key: 'colSpan',
        label: '跨列数',
        type: 'number',
        defaultValue: 1,
        validation: { min: 1, max: 4 },
      },
    ],
  },
  {
    type: 'form-textarea',
    label: '多行文本',
    category: 'form',
    icon: 'AlignLeft',
    description: '多行文本输入框',
    defaultProps: { type: 'textarea', required: false, colSpan: 2 },
    propsPanel: [
      { key: 'name', label: '字段名', type: 'text', required: true },
      { key: 'label', label: '标签', type: 'text', required: true },
      { key: 'required', label: '必填', type: 'boolean', defaultValue: false },
      {
        key: 'colSpan',
        label: '跨列数',
        type: 'number',
        defaultValue: 2,
        validation: { min: 1, max: 4 },
      },
      { key: 'rows', label: '行数', type: 'number', defaultValue: 3, advanced: true },
    ],
  },
  {
    type: 'form-switch',
    label: '开关',
    category: 'form',
    icon: 'ToggleLeft',
    description: '布尔开关',
    defaultProps: { type: 'switch', required: false, colSpan: 1 },
    propsPanel: [
      { key: 'name', label: '字段名', type: 'text', required: true },
      { key: 'label', label: '标签', type: 'text', required: true },
      { key: 'defaultValue', label: '默认值', type: 'boolean', defaultValue: false },
      {
        key: 'colSpan',
        label: '跨列数',
        type: 'number',
        defaultValue: 1,
        validation: { min: 1, max: 4 },
      },
    ],
  },
];

/** 内置布局组件 */
export const LAYOUT_COMPONENTS: DesignerComponent[] = [
  {
    type: 'layout-section',
    label: '表单分组',
    category: 'layout',
    icon: 'Layout',
    description: '表单分组容器（formSection）',
    isContainer: true,
    defaultProps: { title: '基本信息' },
    propsPanel: [
      { key: 'title', label: '分组标题', type: 'text', required: true },
      { key: 'description', label: '分组描述', type: 'textarea', advanced: true },
    ],
  },
];

/** 所有内置组件 */
export const BUILTIN_COMPONENTS: DesignerComponent[] = [...FORM_COMPONENTS, ...LAYOUT_COMPONENTS];

/**
 * 根据类型获取组件定义
 */
export function getComponentByType(type: string): DesignerComponent | undefined {
  return BUILTIN_COMPONENTS.find((c) => c.type === type);
}

/**
 * 按分类获取组件列表
 */
export function getComponentsByCategory(category: ComponentCategory): DesignerComponent[] {
  return BUILTIN_COMPONENTS.filter((c) => c.category === category);
}
