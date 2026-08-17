import React from 'react';
import type { EntitySchema } from '@/schema';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const formatMoney = (amount: number | undefined) =>
  `¥${(Number(amount ?? 0) || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const openingBalanceSchema: EntitySchema = {
  entity: 'finance_opening_balance',
  title: i18n.t('finance.opening_balance.k0'),
  description: i18n.t('finance.opening_balance.k1'),

  api: {
    module: 'finance',
    resource: 'opening-balances',
  },

  fields: [
    {
      name: 'subject_code',
      label: i18n.t('finance.opening_balance.k2'),
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
      label: i18n.t('finance.opening_balance.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'period',
      label: i18n.t('finance.opening_balance.k4'),
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
      label: i18n.t('finance.opening_balance.id_5'),
      type: 'text',
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'debit_balance',
      label: i18n.t('finance.opening_balance.k6'),
      type: 'number',
      required: true,
      defaultValue: 0,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          {
            style: {
              fontWeight: 600,
              color: `var(--color-success-main, ${designTokens.colors.success.dark})`,
            },
          },
          formatMoney(Number(row.debit_balance ?? 0))
        ),
    },
    {
      name: 'credit_balance',
      label: i18n.t('finance.opening_balance.k7'),
      type: 'number',
      required: true,
      defaultValue: 0,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          {
            style: {
              fontWeight: 600,
              color: `var(--color-error-main, ${designTokens.colors.error['800']})`,
            },
          },
          formatMoney(Number(row.credit_balance ?? 0))
        ),
    },
    {
      name: 'created_at',
      label: i18n.t('finance.opening_balance.k8'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: i18n.t('finance.opening_balance.k9'),
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
      title: i18n.t('finance.opening_balance.k10'),
      fields: ['subject_code', 'subject_name', 'period', 'company_id'],
    },
    {
      title: i18n.t('finance.opening_balance.k11'),
      fields: ['debit_balance', 'credit_balance'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.opening_balance.k12'),
  editTitle: i18n.t('finance.opening_balance.k13'),
  detailTitle: i18n.t('finance.opening_balance.k14'),
};
