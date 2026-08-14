import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const salaryAdjustmentSchema: EntitySchema = {
  entity: 'hrm_salary_adjustment',
  title: i18n.t('hrm.salary_adjustment.k0'),
  description: i18n.t('hrm.salary_adjustment.k1'),

  api: {
    module: 'hrm',
    resource: 'salaryAdjustments',
  },

  fields: [
    {
      name: 'employee_id',
      label: i18n.t('hrm.salary_adjustment.id_2'),
      type: 'text',
      listWidth: 120,
      showInForm: false,
      showInList: false,
    },
    {
      name: 'employee_name',
      label: i18n.t('hrm.salary_adjustment.k3'),
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'department',
      label: i18n.t('hrm.salary_adjustment.k4'),
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'adjustment_type',
      label: i18n.t('hrm.salary_adjustment.k5'),
      type: 'select',
      required: true,
      defaultValue: 'bonus',
      options: {
        type: 'static',
        options: [
          { value: 'promotion', label: i18n.t('hrm.salary_adjustment.k6') },
          { value: 'demotion', label: i18n.t('hrm.salary_adjustment.k7') },
          { value: 'bonus', label: i18n.t('hrm.salary_adjustment.k8') },
          { value: 'deduction', label: i18n.t('hrm.salary_adjustment.k9') },
          { value: 'annual', label: i18n.t('hrm.salary_adjustment.k10') },
          { value: 'special', label: i18n.t('hrm.salary_adjustment.k11') },
          { value: 'correction', label: i18n.t('hrm.salary_adjustment.k12') },
        ],
      },
      listWidth: 110,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'old_salary',
      label: i18n.t('hrm.salary_adjustment.k13'),
      type: 'number',
      listWidth: 110,
      align: 'right',
      showInForm: false,
    },
    {
      name: 'new_salary',
      label: i18n.t('hrm.salary_adjustment.k14'),
      type: 'number',
      listWidth: 110,
      align: 'right',
      showInForm: false,
    },
    {
      name: 'adjustment_amount',
      label: i18n.t('hrm.salary_adjustment.k15'),
      type: 'number',
      listWidth: 120,
      align: 'right',
      showInForm: false,
    },
    {
      name: 'effective_date',
      label: i18n.t('hrm.salary_adjustment.k16'),
      type: 'date',
      listWidth: 110,
    },
    {
      name: 'status',
      label: i18n.t('hrm.salary_adjustment.k17'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('hrm.salary_adjustment.k18') },
          { value: 'approved', label: i18n.t('hrm.salary_adjustment.k19') },
          { value: 'rejected', label: i18n.t('hrm.salary_adjustment.k20') },
        ],
      },
      listWidth: 100,
      showInForm: false,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'reason',
      label: i18n.t('hrm.salary_adjustment.k21'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'created_at',
      label: i18n.t('hrm.salary_adjustment.k22'),
      type: 'date',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'updated_at',
      label: i18n.t('hrm.salary_adjustment.k23'),
      type: 'date',
      showInList: false,
      showInForm: false,
    },
  ],

  list: {
    searchFields: ['employee_name', 'department'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        approved: 'success',
        rejected: 'error',
      },
      labelMap: {
        pending: i18n.t('hrm.salary_adjustment.k24'),
        approved: i18n.t('hrm.salary_adjustment.k25'),
        rejected: i18n.t('hrm.salary_adjustment.k26'),
      },
    },
    filters: [
      {
        id: 'adjustment_type',
        label: i18n.t('hrm.salary_adjustment.k27'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.salary_adjustment.k28'), value: 'all' },
          { value: 'promotion', label: i18n.t('hrm.salary_adjustment.k29') },
          { value: 'demotion', label: i18n.t('hrm.salary_adjustment.k30') },
          { value: 'bonus', label: i18n.t('hrm.salary_adjustment.k31') },
          { value: 'deduction', label: i18n.t('hrm.salary_adjustment.k32') },
          { value: 'annual', label: i18n.t('hrm.salary_adjustment.k33') },
          { value: 'special', label: i18n.t('hrm.salary_adjustment.k34') },
          { value: 'correction', label: i18n.t('hrm.salary_adjustment.k35') },
        ],
      },
      {
        id: 'status',
        label: i18n.t('hrm.salary_adjustment.k36'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.salary_adjustment.k37'), value: 'all' },
          { value: 'pending', label: i18n.t('hrm.salary_adjustment.k38') },
          { value: 'approved', label: i18n.t('hrm.salary_adjustment.k39') },
          { value: 'rejected', label: i18n.t('hrm.salary_adjustment.k40') },
        ],
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('hrm.salary_adjustment.k41'),
      fields: ['employee_id', 'department'],
    },
    {
      title: i18n.t('hrm.salary_adjustment.k42'),
      fields: [
        'adjustment_type',
        'old_salary',
        'new_salary',
        'adjustment_amount',
        'effective_date',
      ],
    },
    {
      title: i18n.t('hrm.salary_adjustment.k43'),
      fields: ['reason'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.salary_adjustment.k44'),
  editTitle: i18n.t('hrm.salary_adjustment.k45'),
  detailTitle: i18n.t('hrm.salary_adjustment.k46'),

  actions: ['detail'],
};
