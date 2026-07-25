import React from 'react';
import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig } from '@/schema/schemaExtensions';
import type { SchemaField } from '@/schema/types';

const quotationItemFields: SchemaField[] = [
  {
    name: 'sku',
    label: '产品编码',
    type: 'text',
    required: true,
    listWidth: 120,
  },
  {
    name: 'material_name',
    label: '物料名称',
    type: 'text',
    required: true,
    listWidth: 160,
  },
  {
    name: 'specification',
    label: '规格型号',
    type: 'text',
    listWidth: 140,
  },
  {
    name: 'quantity',
    label: '数量',
    type: 'number',
    required: true,
    defaultValue: 1,
    listWidth: 80,
  },
  {
    name: 'unit_price',
    label: '单价',
    type: 'number',
    required: true,
    defaultValue: 0,
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const val = row.unit_price as number | undefined;
      return val != null ? val.toFixed(2) : '-';
    },
  },
  {
    name: 'subtotal',
    label: '小计',
    type: 'number',
    defaultValue: 0,
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const val = row.subtotal as number | undefined;
      return val != null ? val.toFixed(2) : '-';
    },
  },
  {
    name: 'delivery_time',
    label: '交付时间',
    type: 'text',
    listWidth: 120,
  },
];

const quotationItemNestedTable: NestedTableConfig = {
  field: 'items',
  title: '报价明细',
  columns: columnsFromFields(quotationItemFields),
  fields: quotationItemFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  allowDuplicate: true,
  addButtonText: '新增明细行',
  rowKeyField: 'id',
  minRows: 0,
  formColCount: 2,
  collapsible: false,
  defaultExpanded: true,
};

export const quotationSchema: EntitySchema & { nestedTables: NestedTableConfig[] } = {
  entity: 'quotation',
  title: '报价单管理',
  description: '管理供应商报价单，包括报价明细、金额、交付时间等信息',

  api: {
    module: 'srm',
    resource: 'quotations',
    listMethod: 'listQuotations',
    getMethod: 'getQuotation',
    createMethod: 'createQuotation',
    updateMethod: 'updateQuotation',
    deleteMethod: 'deleteQuotation',
  },

  fields: [
    {
      name: 'quotation_no',
      label: '报价单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'supplier_id',
      label: '供应商',
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '报价标题',
      type: 'text',
      listWidth: 180,
    },
    {
      name: 'total_amount',
      label: '报价总额',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.total_amount as number | undefined;
        const currency = row.currency as string | undefined;
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '¥';
        return React.createElement(
          'span',
          { style: { fontWeight: 600 } },
          `${symbol}${(amount || 0).toLocaleString()}`
        );
      },
    },
    {
      name: 'currency',
      label: '币种',
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: '人民币 (CNY)' },
          { value: 'USD', label: '美元 (USD)' },
          { value: 'EUR', label: '欧元 (EUR)' },
        ],
      },
      listWidth: 90,
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'submitted', label: '已提交' },
          { value: 'accepted', label: '已接受' },
          { value: 'rejected', label: '已拒绝' },
          { value: 'awarded', label: '已中标' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'valid_until',
      label: '有效期至',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'delivery_time',
      label: '交付周期',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'payment_terms',
      label: '付款条款',
      type: 'text',
      showInList: false,
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['quotation_no', 'supplier_id', 'title', 'total_amount', 'status', 'valid_until'],
    searchFields: ['quotation_no', 'supplier_id', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        submitted: 'warning',
        accepted: 'info',
        rejected: 'error',
        awarded: 'success',
      },
      labelMap: {
        draft: '草稿',
        submitted: '已提交',
        accepted: '已接受',
        rejected: '已拒绝',
        awarded: '已中标',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已提交', value: 'submitted' },
          { label: '已接受', value: 'accepted' },
          { label: '已拒绝', value: 'rejected' },
          { label: '已中标', value: 'awarded' },
        ],
      },
      {
        id: 'currency',
        label: '币种',
        type: 'select',
        options: [
          { label: '全部币种', value: 'all' },
          { label: '人民币', value: 'CNY' },
          { label: '美元', value: 'USD' },
          { label: '欧元', value: 'EUR' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['quotation_no', 'supplier_id', 'title', 'status'],
    },
    {
      title: '金额与交付',
      fields: ['total_amount', 'currency', 'valid_until', 'delivery_time'],
    },
    {
      title: '付款与备注',
      fields: ['payment_terms', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新增报价单',
  editTitle: '编辑报价单',
  detailTitle: '报价单详情',

  nestedTables: [quotationItemNestedTable],
};
