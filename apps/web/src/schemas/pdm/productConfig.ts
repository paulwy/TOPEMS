import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const productConfigSchema: EntitySchema = {
  entity: 'pdm_product_config',
  title: i18n.t('pdm.product_config.k0'),
  description: i18n.t('pdm.product_config.k1'),

  api: {
    module: 'pdm',
    resource: 'productConfigs',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('pdm.product_config.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'code',
      label: i18n.t('pdm.product_config.k3'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('pdm.product_config.k4'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('pdm.product_config.k5') },
          { value: 'active', label: i18n.t('pdm.product_config.k6') },
          { value: 'archived', label: i18n.t('pdm.product_config.k7') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'color',
      label: i18n.t('pdm.product_config.k8'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: i18n.t('pdm.product_config.k9'), label: i18n.t('pdm.product_config.k10') },
          { value: i18n.t('pdm.product_config.k11'), label: i18n.t('pdm.product_config.k12') },
          { value: i18n.t('pdm.product_config.k13'), label: i18n.t('pdm.product_config.k14') },
          { value: i18n.t('pdm.product_config.k15'), label: i18n.t('pdm.product_config.k16') },
          { value: i18n.t('pdm.product_config.k17'), label: i18n.t('pdm.product_config.k18') },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'size',
      label: i18n.t('pdm.product_config.k19'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'S', label: 'S' },
          { value: 'M', label: 'M' },
          { value: 'L', label: 'L' },
          { value: 'XL', label: 'XL' },
          { value: 'XXL', label: 'XXL' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'material',
      label: i18n.t('pdm.product_config.k20'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: i18n.t('pdm.product_config.k21'), label: i18n.t('pdm.product_config.k22') },
          { value: i18n.t('pdm.product_config.k23'), label: i18n.t('pdm.product_config.k24') },
          { value: i18n.t('pdm.product_config.k25'), label: i18n.t('pdm.product_config.k26') },
          { value: i18n.t('pdm.product_config.k27'), label: i18n.t('pdm.product_config.k28') },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'grade',
      label: i18n.t('pdm.product_config.k29'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          {
            value: i18n.t('shared.product_config.a_0'),
            label: i18n.t('shared.product_config.a_1'),
          },
          {
            value: i18n.t('shared.product_config.b_2'),
            label: i18n.t('shared.product_config.b_3'),
          },
          {
            value: i18n.t('shared.product_config.c_4'),
            label: i18n.t('shared.product_config.c_5'),
          },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'options',
      label: i18n.t('pdm.product_config.k30'),
      type: 'checkbox-group',
      options: {
        type: 'static',
        options: [
          { value: i18n.t('pdm.product_config.k31'), label: i18n.t('pdm.product_config.k32') },
          { value: i18n.t('pdm.product_config.k33'), label: i18n.t('pdm.product_config.k34') },
          { value: i18n.t('pdm.product_config.k35'), label: i18n.t('pdm.product_config.k36') },
          { value: i18n.t('pdm.product_config.k37'), label: i18n.t('pdm.product_config.k38') },
        ],
      },
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'code', 'color', 'size', 'material', 'grade', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        draft: 'warning',
        archived: 'error',
      },
      labelMap: {
        active: i18n.t('pdm.product_config.k39'),
        draft: i18n.t('pdm.product_config.k40'),
        archived: i18n.t('pdm.product_config.k41'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.product_config.k42'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.product_config.k43'), value: 'all' },
          { label: i18n.t('pdm.product_config.k44'), value: 'draft' },
          { label: i18n.t('pdm.product_config.k45'), value: 'active' },
          { label: i18n.t('pdm.product_config.k46'), value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.product_config.k47'),
      fields: ['name', 'code', 'status'],
    },
    {
      title: i18n.t('pdm.product_config.k48'),
      fields: ['color', 'size', 'material', 'grade'],
    },
    {
      title: i18n.t('pdm.product_config.k49'),
      fields: ['options'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.product_config.k50'),
  editTitle: i18n.t('pdm.product_config.k51'),
  detailTitle: i18n.t('pdm.product_config.k52'),
};
