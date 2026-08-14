import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const scoringDimensionSchema: EntitySchema = {
  entity: 'scoring_dimension',
  title: i18n.t('srm.scoring_dimension.k0'),
  description: i18n.t('srm.scoring_dimension.k1'),

  api: {
    module: 'srm',
    resource: 'scoring-dimensions',
  },

  fields: [
    {
      name: 'dimension_code',
      label: i18n.t('srm.scoring_dimension.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('srm.scoring_dimension.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'weight',
      label: i18n.t('srm.scoring_dimension.k4'),
      type: 'number',
      required: true,
      defaultValue: 10,
      listWidth: 100,
    },
    {
      name: 'min_score',
      label: i18n.t('srm.scoring_dimension.k5'),
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'max_score',
      label: i18n.t('srm.scoring_dimension.k6'),
      type: 'number',
      defaultValue: 100,
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'description',
      label: i18n.t('srm.scoring_dimension.k7'),
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'status',
      label: i18n.t('srm.scoring_dimension.k8'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('srm.scoring_dimension.k9') },
          { value: 'inactive', label: i18n.t('srm.scoring_dimension.k10') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'sort_order',
      label: i18n.t('srm.scoring_dimension.k11'),
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('srm.scoring_dimension.k12'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('srm.scoring_dimension.k13'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['dimension_code', 'name', 'weight', 'description', 'status', 'created_at'],
    searchFields: ['dimension_code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: i18n.t('srm.scoring_dimension.k14'),
        inactive: i18n.t('srm.scoring_dimension.k15'),
      },
    },
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.scoring_dimension.k16'),
      fields: ['dimension_code', 'name', 'description'],
    },
    {
      title: i18n.t('srm.scoring_dimension.k17'),
      fields: ['weight', 'min_score', 'max_score', 'sort_order'],
    },
    {
      title: i18n.t('srm.scoring_dimension.k18'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.scoring_dimension.k19'),
  editTitle: i18n.t('srm.scoring_dimension.k20'),
  detailTitle: i18n.t('srm.scoring_dimension.k21'),
};
