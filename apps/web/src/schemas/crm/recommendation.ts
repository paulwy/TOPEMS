/**
 * 客户推荐 Schema — 驱动 CRMRecommendationPage 的列表与生成推荐表单
 *
 * 列表展示由页面的 customColumns 提供（含 Chip / 进度条等自定义渲染）。
 * Schema 字段仅描述生成推荐所需表单字段。
 */

import type { EntitySchema } from '@/schema';
import { crmApi } from '@/api/crm';

export const recommendationSchema: EntitySchema = {
  entity: 'crm_recommendation',
  title: '客户推荐',
  description: '基于 AI 的智能客户推荐系统',

  api: {
    module: 'crm',
    resource: 'customerRecommendation',
  },

  fields: [
    {
      name: 'customer_id',
      label: '选择客户',
      type: 'select',
      required: true,
      showInList: false,
    },
    {
      name: 'recommendation_type',
      label: '推荐类型',
      type: 'select',
      required: true,
      defaultValue: 'product',
      options: {
        type: 'static',
        options: [
          { value: 'product', label: '产品推荐' },
          { value: 'opportunity', label: '商机推荐' },
          { value: 'service', label: '服务推荐' },
          { value: 'cross-sell', label: '交叉销售' },
          { value: 'upsell', label: '增值销售' },
          { value: 'content', label: '内容推荐' },
          { value: 'general', label: '综合推荐' },
        ],
      },
      showInList: false,
    },
    {
      name: 'top_k',
      label: '推荐数量',
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
      title: '生成推荐',
      fields: ['customer_id', 'recommendation_type', 'top_k'],
    },
  ],

  formColCount: 1,
  createTitle: '生成客户推荐',
  detailTitle: '推荐详情',

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
      queryKey: ['crm', 'customers', 'recommendation-form'],
    },
  ],
};
