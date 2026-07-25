import type { EntitySchema } from '@/schema';

export const performanceSchema: EntitySchema = {
  entity: 'srm_performance',
  title: '供应商绩效',
  description: '分析供应商绩效数据，评估供应商表现，优化供应链',

  api: {
    module: 'srm',
    resource: 'performance/reports',
  },

  fields: [
    {
      name: 'supplier_id',
      label: '供应商ID',
      type: 'text',
      readonly: true,
      hideInForm: true,
      listWidth: 120,
    },
    {
      name: 'supplier_name',
      label: '供应商名称',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'total_orders',
      label: '订单数量',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'total_amount',
      label: '订单金额',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'avg_overall_score',
      label: '综合评分',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'avg_quality_score',
      label: '质量评分',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'avg_delivery_score',
      label: '交付评分',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'on_time_delivery_rate',
      label: '准时交付率',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'defect_rate',
      label: '缺陷率',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'evaluation_count',
      label: '评估次数',
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
  detailTitle: '供应商绩效详情',
};
