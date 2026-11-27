import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema-dsl';
import { columnsFromFields } from '@/schema-dsl/schemaExtensions';
import type { NestedTableConfig, SchemaExtensions } from '@/schema-dsl/schemaExtensions';
import i18n from '@/i18n';
import {
  loadHrmEmployeeOptions,
  loadMesOrderOptions,
  loadWmsWarehouseOptions,
} from '@/schemas/dynamicLoaders';

// 批 9：后端 CreateIssueItemRequest 的字段，前端子表按 camelCase 定义（提交时统一转 snake_case）
const itemFields: NestedTableConfig['fields'] = [
  {
    name: 'materialCode',
    label: i18n.t('mes.material_issue.k30'),
    type: 'text',
    required: true,
    listWidth: 140,
  },
  {
    name: 'materialName',
    label: i18n.t('mes.material_issue.k31'),
    type: 'text',
    required: true,
    listWidth: 160,
  },
  {
    name: 'unit',
    label: i18n.t('mes.material_issue.k32'),
    type: 'text',
    required: true,
    defaultValue: i18n.t('mes.material_issue.k33'),
    listWidth: 80,
  },
  {
    name: 'plannedQuantity',
    label: i18n.t('mes.material_issue.k34'),
    type: 'number',
    required: true,
    listWidth: 100,
  },
  {
    name: 'actualQuantity',
    label: i18n.t('mes.material_issue.k35'),
    type: 'number',
    required: true,
    listWidth: 100,
  },
  { name: 'batchNo', label: i18n.t('mes.material_issue.k36'), type: 'text', listWidth: 120 },
  { name: 'notes', label: i18n.t('mes.material_issue.k37'), type: 'text', listWidth: 160 },
];

const itemsTable: NestedTableConfig = {
  field: 'items',
  title: i18n.t('mes.material_issue.k38'),
  columns: columnsFromFields(itemFields),
  fields: itemFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('mes.material_issue.k39'),
  rowKeyField: 'id',
  minRows: 1,
};

export const materialIssueSchema: EntitySchema & SchemaExtensions = {
  entity: 'mes_material_issue',
  title: i18n.t('mes.material_issue.k0'),
  description: i18n.t('mes.material_issue.k1'),

  api: {
    module: 'mes',
    resource: 'materialIssues',
  },

  // 批 17：写权限资源前缀（API 资源名 → DB 资源名语义映射）
  permissionResource: 'mes:material_issue',

  // 批 9：order_id / warehouse_id / operator_id 都是 uuid 外键
  dynamicOptions: [
    { field: 'order_id', queryKey: ['mes', 'orders', 'forIssue'], loader: loadMesOrderOptions },
    {
      field: 'warehouse_id',
      queryKey: ['wms', 'warehouses', 'forIssue'],
      loader: loadWmsWarehouseOptions,
    },
    {
      field: 'operator_id',
      queryKey: ['hrm', 'employees', 'forIssue'],
      loader: loadHrmEmployeeOptions,
    },
  ],

  fields: [
    {
      name: 'issue_no',
      label: i18n.t('mes.material_issue.k2'),
      type: 'text',
      readonly: true,
      showInForm: false,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'order_id',
      label: i18n.t('mes.material_issue.k40'),
      type: 'select',
      required: true,
      showInList: false,
    },
    {
      name: 'order_no',
      label: i18n.t('mes.material_issue.k3'),
      type: 'text',
      readonly: true,
      showInForm: false,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'warehouse_id',
      label: i18n.t('mes.material_issue.k41'),
      type: 'select',
      required: true,
      showInList: false,
    },
    {
      name: 'operator_id',
      label: i18n.t('mes.material_issue.k4'),
      type: 'select',
      required: true,
      showInList: false,
    },
    {
      name: 'issue_time',
      label: i18n.t('mes.material_issue.k5'),
      type: 'datetime',
      readonly: true,
      showInForm: false,
      listWidth: 160,
    },
    {
      name: 'status',
      label: i18n.t('mes.material_issue.k7'),
      type: 'select',
      showInForm: false,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('mes.material_issue.k8') },
          { value: 'approved', label: i18n.t('mes.material_issue.k9') },
          { value: 'issued', label: i18n.t('mes.material_issue.k10') },
          { value: 'cancelled', label: i18n.t('mes.material_issue.k11') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>, _index: number) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          pending: {
            label: i18n.t('mes.material_issue.k12'),
            bg: 'warning.50',
            color: 'warning.700',
          },
          approved: {
            label: i18n.t('mes.material_issue.k13'),
            bg: 'secondary.100',
            color: 'secondary.700',
          },
          issued: {
            label: i18n.t('mes.material_issue.k14'),
            bg: 'success.50',
            color: 'success.700',
          },
          cancelled: {
            label: i18n.t('mes.material_issue.k15'),
            bg: 'error.50',
            color: 'error.700',
          },
        };
        const s = statusMap[(row.status as string) || 'pending'] || {
          label: String(row.status ?? ''),
          bg: 'grey.100',
          color: 'text.secondary',
        };
        return React.createElement(Chip, {
          size: 'small',
          label: s.label,
          sx: { backgroundColor: s.bg, color: s.color, fontWeight: 500 },
        });
      },
    },
    {
      name: 'items',
      label: i18n.t('mes.material_issue.k18'),
      type: 'textarea',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'notes',
      label: i18n.t('mes.material_issue.k17'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.material_issue.k19'),
      type: 'datetime',
      readonly: true,
      showInList: false,
      showInForm: false,
    },
  ],

  list: {
    columns: ['issue_no', 'order_no', 'issue_time', 'status'],
    searchFields: ['issue_no', 'order_no'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.material_issue.k20'),
        type: 'select',
        options: [
          { label: i18n.t('mes.material_issue.k21'), value: 'all' },
          { label: i18n.t('mes.material_issue.k22'), value: 'pending' },
          { label: i18n.t('mes.material_issue.k23'), value: 'approved' },
          { label: i18n.t('mes.material_issue.k24'), value: 'issued' },
          { label: i18n.t('mes.material_issue.k25'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'detail'],

  formSections: [
    {
      title: i18n.t('mes.material_issue.k26'),
      fields: ['order_id', 'warehouse_id', 'operator_id'],
    },
    {
      title: i18n.t('mes.material_issue.k27'),
      fields: ['notes'],
    },
  ],

  nestedTables: [itemsTable],

  formColCount: 2,
  createTitle: i18n.t('mes.material_issue.k28'),
  detailTitle: i18n.t('mes.material_issue.k29'),
};
