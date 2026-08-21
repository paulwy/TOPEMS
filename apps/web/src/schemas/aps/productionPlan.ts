import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const productionPlanSchema: EntitySchema = {
  entity: 'production_plan',
  title: i18n.t('aps.production_plan_page.k8'),
  description: i18n.t('aps.production_plan_page.k9'),

  api: {
    module: 'aps',
    resource: 'production-plans',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  fields: [
    {
      name: 'plan_no',
      label: i18n.t('aps.production_plan_page.k25'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'plan_name',
      label: i18n.t('aps.production_plan_page.k26'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'plan_type',
      label: i18n.t('aps.production_plan_page.k27'),
      type: 'select',
      defaultValue: 'monthly',
      options: {
        type: 'static',
        options: [
          { value: 'monthly', label: i18n.t('aps.production_plan_page.k28') },
          { value: 'weekly', label: i18n.t('aps.production_plan_page.k29') },
          { value: 'daily', label: i18n.t('aps.production_plan_page.k30') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'start_date',
      label: i18n.t('aps.production_plan_page.k31'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('aps.production_plan_page.k32'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('aps.production_plan_page.k33'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('aps.production_plan_page.k34') },
          { value: 'approved', label: i18n.t('aps.production_plan_page.k35') },
          { value: 'in_progress', label: i18n.t('aps.production_plan_page.k36') },
          { value: 'completed', label: i18n.t('aps.production_plan_page.k37') },
          { value: 'cancelled', label: i18n.t('aps.production_plan_page.k38') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'product_name',
      label: i18n.t('aps.production_plan_page.k39'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'target_quantity',
      label: i18n.t('aps.production_plan_page.k40'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'notes',
      label: i18n.t('aps.production_plan_page.k41'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'plan_no',
      'plan_name',
      'plan_type',
      'start_date',
      'end_date',
      'status',
      'target_quantity',
    ],
    searchFields: ['plan_no', 'plan_name', 'product_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        approved: 'info',
        in_progress: 'primary',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('aps.production_plan_page.k3'),
        approved: i18n.t('aps.production_plan_page.k4'),
        in_progress: i18n.t('aps.production_plan_page.k5'),
        completed: i18n.t('aps.production_plan_page.k6'),
        cancelled: i18n.t('aps.production_plan_page.k7'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('aps.production_plan_page.k17'),
        type: 'select',
        options: [
          { label: i18n.t('aps.production_plan_page.k34'), value: 'draft' },
          { label: i18n.t('aps.production_plan_page.k35'), value: 'approved' },
          { label: i18n.t('aps.production_plan_page.k36'), value: 'in_progress' },
          { label: i18n.t('aps.production_plan_page.k37'), value: 'completed' },
          { label: i18n.t('aps.production_plan_page.k38'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('aps.production_plan_page.k23'),
      fields: ['plan_no', 'plan_name', 'plan_type', 'status'],
    },
    {
      title: i18n.t('aps.production_plan_page.k24'),
      fields: ['start_date', 'end_date', 'product_name', 'target_quantity', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('aps.production_plan_page.k23'),
  editTitle: i18n.t('aps.production_plan_page.k24'),
};
