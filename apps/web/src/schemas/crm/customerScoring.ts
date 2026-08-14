/**
 * 客户评分 Schema — 驱动 CRMCustomerScoringPage 的列表与详情展示
 *
 * 评分为系统自动计算结果，仅支持列表查看与详情展示。
 * 列表展示由页面的 customColumns 提供（含等级徽章 / 趋势图标等自定义渲染）。
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const customerScoringSchema: EntitySchema = {
  entity: 'crm_customer_scoring',
  title: i18n.t('shared.customer_scoring.k0'),
  description: i18n.t('shared.customer_scoring.k1'),

  api: {
    module: 'crm',
    resource: 'customerScoring',
  },

  fields: [
    {
      name: 'customer_name',
      label: i18n.t('shared.customer_scoring.k2'),
      type: 'text',
      listWidth: 200,
      sortable: true,
    },
    {
      name: 'score',
      label: i18n.t('shared.customer_scoring.k3'),
      type: 'number',
      listWidth: 120,
      align: 'center',
      sortable: true,
    },
    {
      name: 'scorelevel',
      label: i18n.t('shared.customer_scoring.k4'),
      type: 'text',
      listWidth: 100,
      align: 'center',
    },
    {
      name: 'trend',
      label: i18n.t('shared.customer_scoring.k5'),
      type: 'text',
      listWidth: 80,
      align: 'center',
    },
    {
      name: 'scoring_date',
      label: i18n.t('shared.customer_scoring.k6'),
      type: 'date',
      listWidth: 150,
      sortable: true,
    },
    {
      name: 'last_score',
      label: i18n.t('shared.customer_scoring.k7'),
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

  detailTitle: i18n.t('shared.customer_scoring.k8'),
};
