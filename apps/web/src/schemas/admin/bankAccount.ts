/**
 * 银行账户管理 Schema — 驱动 BankAccountManagementPage 的完整 CRUD
 *
 * 支持列表展示、创建、编辑、删除、筛选等操作。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

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
  title: '银行账户',
  description: '管理企业银行账户信息',

  api: {
    module: 'erp',
    resource: 'bankAccounts',
  },

  fields: [
    {
      name: 'account_number',
      label: '账号',
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
    },
    {
      name: 'account_name',
      label: '账户名称',
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'bank_name',
      label: '开户银行',
      type: 'text',
      required: true,
      listWidth: 150,
    },
    {
      name: 'bank_branch',
      label: '支行名称',
      type: 'text',
      listWidth: 150,
      showInList: false,
    },
    {
      name: 'account_type',
      label: '账户类型',
      type: 'select',
      required: true,
      defaultValue: 'checking',
      options: {
        type: 'static',
        options: [
          { value: 'checking', label: '基本户' },
          { value: 'savings', label: '一般户' },
          { value: 'dedicated', label: '专用户' },
          { value: 'foreign', label: '外币户' },
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
    },
    {
      name: 'currency',
      label: '币种',
      type: 'select',
      required: true,
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: '人民币 (CNY)' },
          { value: 'USD', label: '美元 (USD)' },
          { value: 'EUR', label: '欧元 (EUR)' },
          { value: 'GBP', label: '英镑 (GBP)' },
          { value: 'JPY', label: '日元 (JPY)' },
          { value: 'HKD', label: '港币 (HKD)' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const currency = String(row.currency || '');
        return CURRENCY_LABELS[currency] || currency;
      },
    },
    {
      name: 'balance',
      label: '余额',
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
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '正常' },
          { value: 'frozen', label: '冻结' },
          { value: 'closed', label: '销户' },
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
    },
    {
      name: 'is_primary',
      label: '主账户',
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
      label: '描述',
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
        label: '账户类型',
        type: 'select',
        options: [
          { value: 'all', label: '全部类型' },
          { value: 'checking', label: '基本户' },
          { value: 'savings', label: '一般户' },
          { value: 'dedicated', label: '专用户' },
          { value: 'foreign', label: '外币户' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '账户状态',
        type: 'select',
        options: [
          { value: 'all', label: '全部状态' },
          { value: 'active', label: '正常' },
          { value: 'frozen', label: '冻结' },
          { value: 'closed', label: '销户' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['account_name', 'account_number', 'bank_name', 'bank_branch'],
    },
    {
      title: '账户属性',
      fields: ['account_type', 'currency', 'status', 'is_primary', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增银行账户',
  editTitle: '编辑银行账户',
  detailTitle: '银行账户详情',
};
