/**
 * 银行账户管理 Schema — 驱动 BankAccountPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const bankAccountSchema: EntitySchema = {
  entity: 'bank_account',
  title: i18n.t('schema:erp.bank_account.meta.title'),
  description: i18n.t('schema:erp.bank_account.meta.description'),

  api: {
    module: 'erp',
    resource: 'bankAccounts',
  },

  fields: [
    {
      name: 'bank_name',
      label: i18n.t('schema:erp.bank_account.bank_name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'branch_name',
      label: i18n.t('schema:erp.bank_account.branch_name.label'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'account_name',
      label: i18n.t('schema:erp.bank_account.account_name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'account_number',
      label: i18n.t('schema:erp.bank_account.account_number.label'),
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'account_type',
      label: i18n.t('schema:erp.bank_account.account_type.label'),
      type: 'select',
      defaultValue: 'basic',
      options: {
        type: 'static',
        options: [
          { value: 'basic', label: i18n.t('schema:erp.bank_account.account_type.option.basic') },
          { value: 'general', label: i18n.t('schema:erp.bank_account.account_type.option.general') },
          { value: 'special', label: i18n.t('schema:erp.bank_account.account_type.option.special') },
          { value: 'temporary', label: i18n.t('schema:erp.bank_account.account_type.option.temporary') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'balance',
      label: i18n.t('schema:erp.bank_account.balance.label'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const balance = row.balance as number | undefined;
        return balance !== undefined
          ? `¥${balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
          : '-';
      },
    },
    {
      name: 'currency',
      label: i18n.t('schema:erp.bank_account.currency.label'),
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: i18n.t('schema:erp.bank_account.currency.option.CNY') },
          { value: 'USD', label: i18n.t('schema:erp.bank_account.currency.option.USD') },
          { value: 'EUR', label: i18n.t('schema:erp.bank_account.currency.option.EUR') },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.bank_account.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:erp.bank_account.status.option.active') },
          { value: 'frozen', label: i18n.t('schema:erp.bank_account.status.option.frozen') },
          { value: 'closed', label: i18n.t('schema:erp.bank_account.status.option.closed') },
          { value: 'pending', label: i18n.t('schema:erp.bank_account.status.option.pending') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'account_name',
      'bank_name',
      'account_number',
      'account_type',
      'currency',
      'balance',
      'status',
    ],
    searchFields: ['account_name', 'bank_name', 'account_number'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        frozen: 'warning',
        closed: 'error',
        pending: 'info',
      },
      labelMap: {
        active: i18n.t('schema:erp.bank_account.status.option.active'),
        frozen: i18n.t('schema:erp.bank_account.status.option.frozen'),
        closed: i18n.t('schema:erp.bank_account.status.option.closed'),
        pending: i18n.t('schema:erp.bank_account.status.option.pending'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.bank_account.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.bank_account.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.bank_account.filter.status.option.active'), value: 'active' },
          { label: i18n.t('schema:erp.bank_account.filter.status.option.frozen'), value: 'frozen' },
          { label: i18n.t('schema:erp.bank_account.filter.status.option.closed'), value: 'closed' },
          { label: i18n.t('schema:erp.bank_account.filter.status.option.pending'), value: 'pending' },
        ],
      },
      {
        id: 'account_type',
        label: i18n.t('schema:erp.bank_account.filter.account_type.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.bank_account.filter.account_type.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.bank_account.filter.account_type.option.basic'), value: 'basic' },
          { label: i18n.t('schema:erp.bank_account.filter.account_type.option.general'), value: 'general' },
          { label: i18n.t('schema:erp.bank_account.filter.account_type.option.special'), value: 'special' },
          { label: i18n.t('schema:erp.bank_account.filter.account_type.option.temporary'), value: 'temporary' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.bank_account.section.0.title'),
      fields: ['bank_name', 'branch_name', 'account_name', 'account_number'],
    },
    {
      title: i18n.t('schema:erp.bank_account.section.1.title'),
      fields: ['account_type', 'currency', 'balance', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.bank_account.meta.createTitle'),
  editTitle: i18n.t('schema:erp.bank_account.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.bank_account.meta.detailTitle'),
};
