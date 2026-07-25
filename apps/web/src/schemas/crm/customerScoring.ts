/**
 * 客户评分 Schema — 驱动 CRMCustomerScoringPage 的列表与详情展示
 *
 * 评分为系统自动计算结果，仅支持列表查看与详情展示。
 * 列表展示由页面的 customColumns 提供（含等级徽章 / 趋势图标等自定义渲染）。
 */

import type { EntitySchema } from '@/schema';

export const customerScoringSchema: EntitySchema = {
  entity: 'crm_customer_scoring',
  title: '客户价值评分',
  description: '根据客户数据自动计算客户价值评分和等级',

  api: {
    module: 'crm',
    resource: 'customerScoring',
  },

  fields: [
    {
      name: 'customer_name',
      label: '客户名称',
      type: 'text',
      listWidth: 200,
      sortable: true,
    },
    {
      name: 'score',
      label: '综合评分',
      type: 'number',
      listWidth: 120,
      align: 'center',
      sortable: true,
    },
    {
      name: 'scorelevel',
      label: '客户等级',
      type: 'text',
      listWidth: 100,
      align: 'center',
    },
    {
      name: 'trend',
      label: '趋势',
      type: 'text',
      listWidth: 80,
      align: 'center',
    },
    {
      name: 'scoring_date',
      label: '评分日期',
      type: 'date',
      listWidth: 150,
      sortable: true,
    },
    {
      name: 'last_score',
      label: '上次评分',
      type: 'number',
      listWidth: 120,
      align: 'center',
    },
  ],

  list: {
    columns: ['customer_name', 'score', 'scorelevel', 'trend', 'scoring_date', 'last_score'],
    searchFields: ['customer_name'],
    pageSize: 10,
  },

  actions: ['detail'],

  detailTitle: '评分详情',
};
