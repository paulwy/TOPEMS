import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const ledgerSchema: EntitySchema = {
  entity: 'finance_ledger',
  title: i18n.t('finance.ledger.k0'),
  description: i18n.t('finance.ledger.k1'),

  api: {
    module: 'finance',
    resource: 'accounts',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('finance.ledger.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('finance.ledger.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category',
      label: i18n.t('finance.ledger.k4'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'asset', label: i18n.t('finance.ledger.k5') },
          { value: 'liability', label: i18n.t('finance.ledger.k6') },
          { value: 'equity', label: i18n.t('finance.ledger.k7') },
          { value: 'cost', label: i18n.t('finance.ledger.k8') },
          { value: 'expense', label: i18n.t('finance.ledger.k9') },
          { value: 'income', label: i18n.t('finance.ledger.k10') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'level',
      label: i18n.t('finance.ledger.k11'),
      type: 'select',
      required: true,
      defaultValue: 1,
      options: {
        type: 'static',
        options: [
          { value: 1, label: i18n.t('finance.ledger.k12') },
          { value: 2, label: i18n.t('finance.ledger.k13') },
          { value: 3, label: i18n.t('finance.ledger.k14') },
          { value: 4, label: i18n.t('finance.ledger.k15') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'parent_code',
      label: i18n.t('finance.ledger.k16'),
      type: 'text',
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'is_cash_flow',
      label: i18n.t('finance.ledger.k17'),
      type: 'select',
      defaultValue: false,
      options: {
        type: 'static',
        options: [
          { value: true, label: i18n.t('finance.ledger.k18') },
          { value: false, label: i18n.t('finance.ledger.k19') },
        ],
      },
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('finance.ledger.k20'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('finance.ledger.k21') },
          { value: 'disabled', label: i18n.t('finance.ledger.k22') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('finance.ledger.k23'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('finance.ledger.k24'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('finance.ledger.k25'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['code', 'name', 'category', 'level', 'parent_code', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        disabled: 'error',
      },
      labelMap: {
        active: i18n.t('finance.ledger.k26'),
        disabled: i18n.t('finance.ledger.k27'),
      },
    },
    filters: [
      {
        id: 'category',
        label: i18n.t('finance.ledger.k28'),
        type: 'select',
        options: [
          { label: i18n.t('finance.ledger.k29'), value: 'all' },
          { label: i18n.t('finance.ledger.k30'), value: 'asset' },
          { label: i18n.t('finance.ledger.k31'), value: 'liability' },
          { label: i18n.t('finance.ledger.k32'), value: 'equity' },
          { label: i18n.t('finance.ledger.k33'), value: 'cost' },
          { label: i18n.t('finance.ledger.k34'), value: 'expense' },
          { label: i18n.t('finance.ledger.k35'), value: 'income' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('finance.ledger.k36'),
        type: 'select',
        options: [
          { label: i18n.t('finance.ledger.k37'), value: 'all' },
          { label: i18n.t('finance.ledger.k38'), value: 'active' },
          { label: i18n.t('finance.ledger.k39'), value: 'disabled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.ledger.k40'),
      fields: ['code', 'name', 'category', 'level', 'status'],
    },
    {
      title: i18n.t('finance.ledger.k41'),
      fields: ['parent_code', 'is_cash_flow'],
    },
    {
      title: i18n.t('finance.ledger.k42'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.ledger.k43'),
  editTitle: i18n.t('finance.ledger.k44'),
  detailTitle: i18n.t('finance.ledger.k45'),
};
