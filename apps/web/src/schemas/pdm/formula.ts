import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const formulaSchema: EntitySchema = {
  entity: 'pdm_formula',
  title: i18n.t('pdm.formula.k0'),
  description: i18n.t('pdm.formula.k1'),

  api: {
    module: 'pdm',
    resource: 'formulas',
  },

  fields: [
    {
      name: 'formula_no',
      label: i18n.t('pdm.formula.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('pdm.formula.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'version',
      label: i18n.t('pdm.formula.k4'),
      type: 'text',
      defaultValue: '1.0',
      listWidth: 80,
    },
    {
      name: 'process_id',
      label: i18n.t('pdm.formula.k5'),
      type: 'text',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('pdm.formula.k6'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('pdm.formula.k7') },
          { value: 'active', label: i18n.t('pdm.formula.k8') },
          { value: 'inactive', label: i18n.t('pdm.formula.k9') },
          { value: 'approved', label: i18n.t('pdm.formula.k10') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('pdm.formula.k11'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('pdm.formula.k12'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 130,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('pdm.formula.k13'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['formula_no', 'name', 'version', 'status', 'created_at'],
    searchFields: ['formula_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'warning',
        active: 'success',
        inactive: 'default',
        approved: 'info',
      },
      labelMap: {
        draft: i18n.t('pdm.formula.k14'),
        active: i18n.t('pdm.formula.k15'),
        inactive: i18n.t('pdm.formula.k16'),
        approved: i18n.t('pdm.formula.k17'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.formula.k18'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.formula.k19'), value: 'all' },
          { label: i18n.t('pdm.formula.k20'), value: 'draft' },
          { label: i18n.t('pdm.formula.k21'), value: 'active' },
          { label: i18n.t('pdm.formula.k22'), value: 'inactive' },
          { label: i18n.t('pdm.formula.k23'), value: 'approved' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.formula.k24'),
      fields: ['formula_no', 'name', 'version', 'process_id'],
    },
    {
      title: i18n.t('pdm.formula.k25'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.formula.k26'),
  editTitle: i18n.t('pdm.formula.k27'),
  detailTitle: i18n.t('pdm.formula.k28'),
};
