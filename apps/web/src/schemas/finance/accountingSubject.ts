import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const accountingSubjectSchema: EntitySchema = {
  entity: 'finance_accounting_subject',
  title: i18n.t('finance.accounting_subject.k0'),
  description: i18n.t('finance.accounting_subject.k1'),

  api: {
    module: 'finance',
    resource: 'accountingSubjects',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('finance.accounting_subject.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: i18n.t('finance.accounting_subject.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category',
      label: i18n.t('finance.accounting_subject.k4'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'asset', label: i18n.t('finance.accounting_subject.k5') },
          { value: 'liability', label: i18n.t('finance.accounting_subject.k6') },
          { value: 'equity', label: i18n.t('finance.accounting_subject.k7') },
          { value: 'cost', label: i18n.t('finance.accounting_subject.k8') },
          { value: 'expense', label: i18n.t('finance.accounting_subject.k9') },
          { value: 'income', label: i18n.t('finance.accounting_subject.k10') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'level',
      label: i18n.t('finance.accounting_subject.k11'),
      type: 'select',
      required: true,
      defaultValue: 1,
      options: {
        type: 'static',
        options: [
          { value: 1, label: i18n.t('finance.accounting_subject.k12') },
          { value: 2, label: i18n.t('finance.accounting_subject.k13') },
          { value: 3, label: i18n.t('finance.accounting_subject.k14') },
          { value: 4, label: i18n.t('finance.accounting_subject.k15') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'parent_code',
      label: i18n.t('finance.accounting_subject.k16'),
      type: 'text',
      listWidth: 140,
      showInList: false,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'is_cash_flow',
      label: i18n.t('finance.accounting_subject.k17'),
      type: 'select',
      defaultValue: false,
      options: {
        type: 'static',
        options: [
          { value: true, label: i18n.t('finance.accounting_subject.k18') },
          { value: false, label: i18n.t('finance.accounting_subject.k19') },
        ],
      },
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('finance.accounting_subject.k20'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('finance.accounting_subject.k21') },
          { value: 'disabled', label: i18n.t('finance.accounting_subject.k22') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'description',
      label: i18n.t('finance.accounting_subject.k23'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('finance.accounting_subject.k24'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: i18n.t('finance.accounting_subject.k25'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'category', 'level', 'is_cash_flow', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        disabled: 'error',
      },
      labelMap: {
        active: i18n.t('finance.accounting_subject.k26'),
        disabled: i18n.t('finance.accounting_subject.k27'),
      },
    },
    filters: [
      {
        id: 'category',
        label: i18n.t('finance.accounting_subject.k28'),
        type: 'select',
        options: [
          { label: i18n.t('finance.accounting_subject.k29'), value: 'all' },
          { label: i18n.t('finance.accounting_subject.k30'), value: 'asset' },
          { label: i18n.t('finance.accounting_subject.k31'), value: 'liability' },
          { label: i18n.t('finance.accounting_subject.k32'), value: 'equity' },
          { label: i18n.t('finance.accounting_subject.k33'), value: 'cost' },
          { label: i18n.t('finance.accounting_subject.k34'), value: 'expense' },
          { label: i18n.t('finance.accounting_subject.k35'), value: 'income' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('finance.accounting_subject.k36'),
        type: 'select',
        options: [
          { label: i18n.t('finance.accounting_subject.k37'), value: 'all' },
          { label: i18n.t('finance.accounting_subject.k38'), value: 'active' },
          { label: i18n.t('finance.accounting_subject.k39'), value: 'disabled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.accounting_subject.k40'),
      fields: ['code', 'name', 'category', 'level', 'status'],
    },
    {
      title: i18n.t('finance.accounting_subject.k41'),
      fields: ['parent_code', 'is_cash_flow'],
    },
    {
      title: i18n.t('finance.accounting_subject.k42'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.accounting_subject.k43'),
  editTitle: i18n.t('finance.accounting_subject.k44'),
  detailTitle: i18n.t('finance.accounting_subject.k45'),
};
