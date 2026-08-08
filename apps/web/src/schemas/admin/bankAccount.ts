/**
 * 银行账户管理 Schema — 驱动 BankAccountManagementPage 的完整 CRUD
 *
 * 支持列表展示、创建、编辑、删除、筛选等操作。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: '基本户',
  savings: '一般户',
  dedicated: '专用户',
  foreign: '外币户',
};

const ACCOUNT_TYPE_COLORS: Record<
  string,
  'primary' | 'success' | 'secondary' | 'warning' | 'default'
> = {
  checking: 'primary',
  savings: 'success',
  dedicated: 'secondary',
  foreign: 'warning',
};

const STATUS_LABELS: Record<string, string> = {
  active: '正常',
  frozen: '冻结',
  closed: '销户',
};

const STATUS_COLORS: Record<string, 'success' | 'error' | 'default'> = {
  active: 'success',
  frozen: 'error',
  closed: 'default',
};

const CURRENCY_LABELS: Record<string, string> = {
  CNY: '人民币',
  USD: '美元',
  EUR: '欧元',
  GBP: '英镑',
  JPY: '日元',
  HKD: '港币',
};

const formatBalance = (amount: number | undefined) => {
  return (amount || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const bankAccountSchema: EntitySchema = {
  entity: 'admin_bank_account',
  title: i18n.t('schema:admin.bank_account.meta.title'),
  description: i18n.t('schema:admin.bank_account.meta.description'),

  api: {
    module: 'erp',
    resource: 'bankAccounts',
  },

  fields: [
    {
      name: 'account_number',
      label: i18n.t('schema:admin.bank_account.account_number.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontFamily: 'monospace', fontSize: '0.875rem' } },
          String(row.account_number || '')
        ),
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'account_name',
      label: i18n.t('schema:admin.bank_account.account_name.label'),
      type: 'text',
      required: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'bank_name',
      label: i18n.t('schema:admin.bank_account.bank_name.label'),
      type: 'text',
      required: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'bank_branch',
      label: i18n.t('schema:admin.bank_account.bank_branch.label'),
      type: 'text',
      listWidth: 150,
      showInList: false,
    },
    {
      name: 'account_type',
      label: i18n.t('schema:admin.bank_account.account_type.label'),
      type: 'select',
      required: true,
      defaultValue: 'checking',
      options: {
        type: 'static',
        options: [
          {
            value: 'checking',
            label: i18n.t('schema:admin.bank_account.account_type.option.checking'),
          },
          {
            value: 'savings',
            label: i18n.t('schema:admin.bank_account.account_type.option.savings'),
          },
          {
            value: 'dedicated',
            label: i18n.t('schema:admin.bank_account.account_type.option.dedicated'),
          },
          {
            value: 'foreign',
            label: i18n.t('schema:admin.bank_account.account_type.option.foreign'),
          },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const accountType = String(row.account_type || '');
        const label = ACCOUNT_TYPE_LABELS[accountType] || accountType;
        const color = ACCOUNT_TYPE_COLORS[accountType] || 'default';
        const colorMap: Record<string, string> = {
          primary: 'var(--color-primary-main, #1976d2)',
          success: 'var(--color-success-main, #2e7d32)',
          secondary: 'var(--color-secondary-main, #9c27b0)',
          warning: 'var(--color-warning-main, #ed6c02)',
          default: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
        };
        const bgColorMap: Record<string, string> = {
          primary: 'var(--color-primary-lighter, #e3f2fd)',
          success: 'var(--color-success-lighter, #e8f5e9)',
          secondary: 'var(--color-secondary-lighter, #f3e5f5)',
          warning: 'var(--color-warning-lighter, #fff3e0)',
          default: 'var(--color-action-hover, rgba(0,0,0,0.04))',
        };
        return React.createElement(
          'span',
          {
            style: {
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: bgColorMap[color],
              color: colorMap[color],
            },
          },
          label
        );
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'currency',
      label: i18n.t('schema:admin.bank_account.currency.label'),
      type: 'select',
      required: true,
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: i18n.t('schema:admin.bank_account.currency.option.CNY') },
          { value: 'USD', label: i18n.t('schema:admin.bank_account.currency.option.USD') },
          { value: 'EUR', label: i18n.t('schema:admin.bank_account.currency.option.EUR') },
          { value: 'GBP', label: i18n.t('schema:admin.bank_account.currency.option.GBP') },
          { value: 'JPY', label: i18n.t('schema:admin.bank_account.currency.option.JPY') },
          { value: 'HKD', label: i18n.t('schema:admin.bank_account.currency.option.HKD') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const currency = String(row.currency || '');
        return CURRENCY_LABELS[currency] || currency;
      },
      validation: [{ type: 'maxLength', value: 3 }],
    },
    {
      name: 'balance',
      label: i18n.t('schema:admin.bank_account.balance.label'),
      type: 'number',
      hideInForm: true,
      listWidth: 140,
      align: 'right',
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          {
            style: {
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              textAlign: 'right',
              display: 'inline-block',
              width: '100%',
            },
          },
          formatBalance(row.balance as number | undefined)
        ),
    },
    {
      name: 'status',
      label: i18n.t('schema:admin.bank_account.status.label'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:admin.bank_account.status.option.active') },
          { value: 'frozen', label: i18n.t('schema:admin.bank_account.status.option.frozen') },
          { value: 'closed', label: i18n.t('schema:admin.bank_account.status.option.closed') },
        ],
      },
      listWidth: 90,
      renderCell: (row: Record<string, unknown>) => {
        const status = String(row.status || 'active');
        const label = STATUS_LABELS[status] || status;
        const color = STATUS_COLORS[status] || 'default';
        const colorMap: Record<string, string> = {
          success: 'var(--color-success-main, #2e7d32)',
          error: 'var(--color-error-main, #c62828)',
          default: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
        };
        const bgColorMap: Record<string, string> = {
          success: 'var(--color-success-lighter, #e8f5e9)',
          error: 'var(--color-error-lighter, #ffebee)',
          default: 'var(--color-action-hover, rgba(0,0,0,0.04))',
        };
        return React.createElement(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: bgColorMap[color],
              color: colorMap[color],
            },
          },
          label
        );
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'is_primary',
      label: i18n.t('schema:admin.bank_account.is_primary.label'),
      type: 'switch',
      defaultValue: false,
      listWidth: 90,
      renderCell: (row: Record<string, unknown>) => {
        const isPrimary = row.is_primary === true;
        if (!isPrimary) {
          return React.createElement(
            'span',
            { style: { color: 'var(--color-text-disabled, rgba(0,0,0,0.38))' } },
            '-'
          );
        }
        return React.createElement(
          'span',
          {
            style: {
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: 'var(--color-warning-lighter, #fff3e0)',
              color: 'var(--color-warning-main, #ed6c02)',
            },
          },
          '主账户'
        );
      },
    },
    {
      name: 'description',
      label: i18n.t('schema:admin.bank_account.description.label'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'account_number',
      'account_name',
      'bank_name',
      'account_type',
      'currency',
      'balance',
      'status',
      'is_primary',
    ],
    searchFields: ['account_name', 'account_number', 'bank_name'],
    pageSize: 20,
    filters: [
      {
        id: 'account_type',
        label: i18n.t('schema:admin.bank_account.filter.account_type.label'),
        type: 'select',
        options: [
          {
            value: 'all',
            label: i18n.t('schema:admin.bank_account.filter.account_type.option.all'),
          },
          {
            value: 'checking',
            label: i18n.t('schema:admin.bank_account.filter.account_type.option.checking'),
          },
          {
            value: 'savings',
            label: i18n.t('schema:admin.bank_account.filter.account_type.option.savings'),
          },
          {
            value: 'dedicated',
            label: i18n.t('schema:admin.bank_account.filter.account_type.option.dedicated'),
          },
          {
            value: 'foreign',
            label: i18n.t('schema:admin.bank_account.filter.account_type.option.foreign'),
          },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('schema:admin.bank_account.filter.status.label'),
        type: 'select',
        options: [
          { value: 'all', label: i18n.t('schema:admin.bank_account.filter.status.option.all') },
          {
            value: 'active',
            label: i18n.t('schema:admin.bank_account.filter.status.option.active'),
          },
          {
            value: 'frozen',
            label: i18n.t('schema:admin.bank_account.filter.status.option.frozen'),
          },
          {
            value: 'closed',
            label: i18n.t('schema:admin.bank_account.filter.status.option.closed'),
          },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:admin.bank_account.section.0.title'),
      fields: ['account_name', 'account_number', 'bank_name', 'bank_branch'],
    },
    {
      title: i18n.t('schema:admin.bank_account.section.1.title'),
      fields: ['account_type', 'currency', 'status', 'is_primary', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:admin.bank_account.meta.createTitle'),
  editTitle: i18n.t('schema:admin.bank_account.meta.editTitle'),
  detailTitle: i18n.t('schema:admin.bank_account.meta.detailTitle'),
};
