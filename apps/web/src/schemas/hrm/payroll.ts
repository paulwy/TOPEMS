import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const payrollSchema: EntitySchema = {
  entity: 'hrm_payroll',
  title: i18n.t('hrm.payroll.k0'),
  description: i18n.t('hrm.payroll.k1'),

  api: {
    module: 'hrm',
    resource: 'payroll',
  },

  fields: [
    {
      name: 'pay_period',
      label: i18n.t('hrm.payroll.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'employee_count',
      label: i18n.t('hrm.payroll.k3'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'total_amount',
      label: i18n.t('hrm.payroll.k4'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('hrm.payroll.k5'),
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('hrm.payroll.k6') },
          { value: 'calculated', label: i18n.t('hrm.payroll.k7') },
          { value: 'paid', label: i18n.t('hrm.payroll.k8') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'paid_at',
      label: i18n.t('hrm.payroll.k9'),
      type: 'datetime',
      listWidth: 160,
    },
    {
      name: 'created_at',
      label: i18n.t('hrm.payroll.k10'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('hrm.payroll.k11'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['pay_period', 'employee_count', 'total_amount', 'status', 'paid_at', 'created_at'],
    searchFields: ['pay_period'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'warning',
        calculated: 'primary',
        paid: 'success',
      },
      labelMap: {
        draft: i18n.t('hrm.payroll.k12'),
        calculated: i18n.t('hrm.payroll.k13'),
        paid: i18n.t('hrm.payroll.k14'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('hrm.payroll.k15'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.payroll.k16'), value: 'all' },
          { label: i18n.t('hrm.payroll.k17'), value: 'draft' },
          { label: i18n.t('hrm.payroll.k18'), value: 'calculated' },
          { label: i18n.t('hrm.payroll.k19'), value: 'paid' },
        ],
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('hrm.payroll.k20'),
      fields: ['pay_period', 'status'],
    },
    {
      title: i18n.t('hrm.payroll.k21'),
      fields: ['employee_count', 'total_amount', 'paid_at'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.payroll.k22'),
  editTitle: i18n.t('hrm.payroll.k23'),
  detailTitle: i18n.t('hrm.payroll.k24'),

  actions: ['create', 'detail', 'delete'],
};
