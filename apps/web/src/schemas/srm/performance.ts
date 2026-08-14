import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const performanceSchema: EntitySchema = {
  entity: 'srm_performance',
  title: i18n.t('srm.performance.k0'),
  description: i18n.t('srm.performance.k1'),

  api: {
    module: 'srm',
    resource: 'performance/reports',
  },

  fields: [
    {
      name: 'supplier_id',
      label: i18n.t('srm.performance.id_2'),
      type: 'text',
      readonly: true,
      hideInForm: true,
      listWidth: 120,
    },
    {
      name: 'supplier_name',
      label: i18n.t('srm.performance.k3'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'total_orders',
      label: i18n.t('srm.performance.k4'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'total_amount',
      label: i18n.t('srm.performance.k5'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'avg_overall_score',
      label: i18n.t('srm.performance.k6'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'avg_quality_score',
      label: i18n.t('srm.performance.k7'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'avg_delivery_score',
      label: i18n.t('srm.performance.k8'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'on_time_delivery_rate',
      label: i18n.t('srm.performance.k9'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'defect_rate',
      label: i18n.t('srm.performance.k10'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'evaluation_count',
      label: i18n.t('srm.performance.k11'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'supplier_name',
      'total_orders',
      'total_amount',
      'avg_overall_score',
      'avg_quality_score',
      'avg_delivery_score',
      'on_time_delivery_rate',
      'defect_rate',
      'evaluation_count',
    ],
    searchFields: ['supplier_name'],
    pageSize: 10,
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: i18n.t('srm.performance.k12'),
};
