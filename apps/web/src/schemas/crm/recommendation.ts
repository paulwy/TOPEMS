/**
 * 客户推荐 Schema — 驱动 CRMRecommendationPage 的列表与生成推荐表单
 *
 * 列表展示由页面的 customColumns 提供（含 Chip / 进度条等自定义渲染）。
 * Schema 字段仅描述生成推荐所需表单字段。
 */

import type { EntitySchema } from '@/schema';
import { crmApi } from '@/api/crm';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const recommendationSchema: EntitySchema = {
  entity: 'crm_recommendation',
  title: i18n.t('shared.recommendation.k0'),
  description: i18n.t('shared.recommendation.ai_1'),

  api: {
    module: 'crm',
    resource: 'customerRecommendation',
  },

  fields: [
    {
      name: 'customer_id',
      label: i18n.t('shared.recommendation.k2'),
      type: 'select',
      required: true,
      showInList: false,
    },
    {
      name: 'recommendation_type',
      label: i18n.t('shared.recommendation.k3'),
      type: 'select',
      required: true,
      defaultValue: 'product',
      options: {
        type: 'static',
        options: [
          { value: 'product', label: i18n.t('shared.recommendation.k4') },
          { value: 'opportunity', label: i18n.t('shared.recommendation.k5') },
          { value: 'service', label: i18n.t('shared.recommendation.k6') },
          { value: 'cross-sell', label: i18n.t('shared.recommendation.k7') },
          { value: 'upsell', label: i18n.t('shared.recommendation.k8') },
          { value: 'content', label: i18n.t('shared.recommendation.k9') },
          { value: 'general', label: i18n.t('shared.recommendation.k10') },
        ],
      },
      showInList: false,
    },
    {
      name: 'top_k',
      label: i18n.t('shared.recommendation.k11'),
      type: 'number',
      defaultValue: 10,
      showInList: false,
    },
  ],

  list: {
    pageSize: 20,
  },

  actions: ['create', 'detail'],

  formSections: [
    {
      title: i18n.t('shared.recommendation.k12'),
      fields: ['customer_id', 'recommendation_type', 'top_k'],
    },
  ],

  formColCount: 1,
  createTitle: i18n.t('shared.recommendation.k13'),
  detailTitle: i18n.t('shared.recommendation.k14'),

  dynamicOptions: [
    {
      field: 'customer_id',
      loader: async () => {
        const res = await crmApi.customers.list({ page: 1, pageSize: 100 });
        if (res.success && res.data) {
          return (res.data.items || []).map((c) => ({ value: c.id, label: c.name }));
        }
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.CRM_CUSTOMERS_RECOMMENDATION_FORM_BASE,
    },
  ],
};
