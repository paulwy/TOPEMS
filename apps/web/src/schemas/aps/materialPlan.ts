import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const materialPlanSchema: EntitySchema = {
  entity: 'material_plan',
  title: i18n.t('aps.material_plan_page.k6'),
  description: i18n.t('aps.material_plan_page.k7'),

  api: {
    module: 'aps',
    resource: 'material-plans',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  fields: [
    {
      name: 'plan_no',
      label: i18n.t('aps.material_plan_page.k10'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'material_code',
      label: i18n.t('aps.material_plan_page.k11'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'material_name',
      label: i18n.t('aps.material_plan_page.k12'),
      type: 'text',
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'required_quantity',
      label: i18n.t('aps.material_plan_page.k13'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'available_quantity',
      label: i18n.t('aps.material_plan_page.k14'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'shortfall_quantity',
      label: i18n.t('aps.material_plan_page.k15'),
      type: 'number',
      readonly: true,
      hideInForm: true,
      listWidth: 120,
    },
    {
      name: 'required_date',
      label: i18n.t('aps.material_plan_page.k16'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'supply_type',
      label: i18n.t('aps.material_plan_page.k17'),
      type: 'select',
      defaultValue: 'purchase',
      options: {
        type: 'static',
        options: [
          { value: 'purchase', label: i18n.t('aps.material_plan_page.k0') },
          { value: 'transfer', label: i18n.t('aps.material_plan_page.k1') },
          { value: 'produce', label: i18n.t('aps.material_plan_page.k2') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('aps.material_plan_page.k18'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('aps.material_plan_page.k3') },
          { value: 'satisfied', label: i18n.t('aps.material_plan_page.k4') },
          { value: 'shortage', label: i18n.t('aps.material_plan_page.k5') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'plan_no',
      'material_code',
      'material_name',
      'required_quantity',
      'available_quantity',
      'shortfall_quantity',
      'required_date',
      'supply_type',
      'status',
    ],
    searchFields: ['plan_no', 'material_code', 'material_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'default',
        satisfied: 'success',
        shortage: 'error',
      },
      labelMap: {
        pending: i18n.t('aps.material_plan_page.k3'),
        satisfied: i18n.t('aps.material_plan_page.k4'),
        shortage: i18n.t('aps.material_plan_page.k5'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('aps.material_plan_page.k18'),
        type: 'select',
        options: [
          { label: i18n.t('aps.material_plan_page.k3'), value: 'pending' },
          { label: i18n.t('aps.material_plan_page.k4'), value: 'satisfied' },
          { label: i18n.t('aps.material_plan_page.k5'), value: 'shortage' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formColCount: 2,
  createTitle: i18n.t('aps.material_plan_page.k6'),
  editTitle: i18n.t('aps.material_plan_page.k6'),
};
