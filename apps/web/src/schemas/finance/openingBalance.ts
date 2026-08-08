import React from 'react';
import type { EntitySchema } from '@/schema';

const formatMoney = (amount: number | undefined) =>
  `¥${(Number(amount ?? 0) || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const openingBalanceSchema: EntitySchema = {
  entity: 'finance_opening_balance',
  title: '期初余额',
  description: '管理科目期初余额，支持结转与期间查询',

  api: {
    module: 'finance',
    resource: 'opening-balances',
  },

  fields: [
    {
      name: 'subject_code',
      label: '科目编码',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontWeight: 600, fontFamily: 'monospace' } },
          String(row.subject_code || '')
        ),
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'subject_name',
      label: '科目名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'period',
      label: '期间',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontFamily: 'monospace' } },
          String(row.period || '')
        ),
      validation: [{ type: 'maxLength', value: 6 }],
    },
    {
      name: 'company_id',
      label: '公司ID',
      type: 'text',
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'debit_balance',
      label: '借方余额',
      type: 'number',
      required: true,
      defaultValue: 0,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontWeight: 600, color: 'var(--color-success-main, #2e7d32)' } },
          formatMoney(Number(row.debit_balance ?? 0))
        ),
    },
    {
      name: 'credit_balance',
      label: '贷方余额',
      type: 'number',
      required: true,
      defaultValue: 0,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontWeight: 600, color: 'var(--color-error-main, #c62828)' } },
          formatMoney(Number(row.credit_balance ?? 0))
        ),
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
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: ['subject_code', 'subject_name', 'period', 'debit_balance', 'credit_balance'],
    searchFields: ['subject_code', 'subject_name'],
    pageSize: 10,
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '科目信息',
      fields: ['subject_code', 'subject_name', 'period', 'company_id'],
    },
    {
      title: '期初余额',
      fields: ['debit_balance', 'credit_balance'],
    },
  ],

  formColCount: 2,
  createTitle: '新增期初余额',
  editTitle: '编辑期初余额',
  detailTitle: '期初余额详情',
};
