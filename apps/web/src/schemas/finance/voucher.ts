import React from 'react';
import type { EntitySchema } from '@/schema';

const formatCurrency = (amount: number | undefined, color?: string) => {
  const style: React.CSSProperties = { fontWeight: 'bold' };
  if (color) (style as Record<string, string>).color = color;
  return React.createElement(
    'span',
    { style },
    `¥${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  );
};

export const voucherSchema: EntitySchema = {
  entity: 'finance_voucher',
  title: '财务凭证',
  description: '管理财务凭证，支持凭证审核、反审核及用友凭证导入',

  api: {
    module: 'finance',
    resource: 'vouchers',
  },

  fields: [
    {
      name: 'voucher_number',
      label: '凭证编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'voucher_date',
      label: '凭证日期',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'period',
      label: '会计期间',
      type: 'text',
      required: true,
      listWidth: 100,
    },
    {
      name: 'attachment_count',
      label: '附件数',
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'summary',
      label: '摘要',
      type: 'textarea',
      listWidth: 180,
      showInList: false,
    },
    {
      name: 'maker_name',
      label: '制单人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'total_debit',
      label: '借方合计',
      type: 'number',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => formatCurrency(row.total_debit as number, '#d32f2f'),
    },
    {
      name: 'total_credit',
      label: '贷方合计',
      type: 'number',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => formatCurrency(row.total_credit as number, '#2e7d32'),
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
          { value: 'pending', label: '待审核' },
          { value: 'approved', label: '已审核' },
          { value: 'posted', label: '已过账' },
          { value: 'imported', label: '已导入' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'voucher_number',
      'voucher_date',
      'period',
      'total_debit',
      'total_credit',
      'maker_name',
      'status',
    ],
    searchFields: ['voucher_number', 'summary', 'maker_name'],
    pageSize: 10,
    selectable: true,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'success',
        posted: 'success',
        imported: 'info',
      },
      labelMap: {
        draft: '草稿',
        pending: '待审核',
        approved: '已审核',
        posted: '已过账',
        imported: '已导入',
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
          { label: '待审核', value: 'pending' },
          { label: '已审核', value: 'approved' },
          { label: '已过账', value: 'posted' },
          { label: '已导入', value: 'imported' },
        ],
      },
      {
        id: 'period',
        label: '会计期间',
        type: 'select',
        options: [
          { label: '全部期间', value: 'all' },
          { label: '2024-01', value: '2024-01' },
          { label: '2024-02', value: '2024-02' },
          { label: '2024-03', value: '2024-03' },
          { label: '2024-04', value: '2024-04' },
          { label: '2024-05', value: '2024-05' },
          { label: '2024-06', value: '2024-06' },
        ],
      },
    ],
  },

  // CRUD 操作由页面通过 customRowActions 与自定义弹窗接管
  actions: [],

  formSections: [
    {
      title: '基本信息',
      fields: ['voucher_number', 'voucher_date', 'period', 'attachment_count'],
    },
    {
      title: '业务信息',
      fields: ['summary', 'maker_name', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增凭证',
  editTitle: '编辑凭证',
  detailTitle: '凭证详情',
};
