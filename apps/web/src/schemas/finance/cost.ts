import React from 'react';
import type { EntitySchema } from '@/schema';
import { designTokens } from '@topems/tokens';

const formatMoney = (amount: number | undefined, color?: string) => {
  const style: React.CSSProperties = { fontFamily: 'monospace', fontWeight: 600 };
  if (color) (style as Record<string, string>).color = color;
  return React.createElement('span', { style }, `¥${(amount || 0).toLocaleString('zh-CN')}`);
};

export const costSchema: EntitySchema = {
  entity: 'finance_cost',
  title: '成本管理',
  description: '管理成本中心预算和实际成本，分析成本差异',

  api: {
    module: 'finance',
    resource: 'accounts',
  },

  fields: [
    {
      name: 'code',
      label: '科目编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontWeight: 600, color: `var(--color-primary-main, ${designTokens.colors.primary.dark})` } },
          String(row.code || '')
        ),
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: '成本项目',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement('span', { style: { fontWeight: 500 } }, String(row.name || '')),
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'debit_balance',
      label: '借方余额',
      type: 'number',
      listWidth: 140,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(row.debit_balance as number | undefined),
    },
    {
      name: 'period_debit',
      label: '本期借方发生',
      type: 'number',
      listWidth: 140,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(row.period_debit as number | undefined, `var(--color-success-main, ${designTokens.colors.success.dark})`),
    },
    {
      name: 'period_credit',
      label: '本期贷方发生',
      type: 'number',
      listWidth: 140,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(row.period_credit as number | undefined, `var(--color-error-main, ${designTokens.colors.error['800']})`),
    },
    {
      name: 'balance_direction',
      label: '余额方向',
      type: 'select',
      required: true,
      defaultValue: 'debit',
      options: {
        type: 'static',
        options: [
          { value: 'debit', label: '借方' },
          { value: 'credit', label: '贷方' },
        ],
      },
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'level',
      label: '科目级别',
      type: 'select',
      required: true,
      defaultValue: 1,
      options: {
        type: 'static',
        options: [
          { value: 1, label: '一级' },
          { value: 2, label: '二级' },
          { value: 3, label: '三级' },
          { value: 4, label: '四级' },
        ],
      },
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'disabled', label: '停用' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'debit_balance', 'period_debit', 'period_credit', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        disabled: 'error',
      },
      labelMap: {
        active: '启用',
        disabled: '停用',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'disabled' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'balance_direction', 'level', 'status'],
    },
    {
      title: '备注',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增成本科目',
  editTitle: '编辑成本科目',
  detailTitle: '成本科目详情',
};
