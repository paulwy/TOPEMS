/**
 * 客户分群 Schema — 驱动 CRMCustomerSegmentationPage 的列表与新建分群表单
 *
 * 列表展示由页面的 customColumns 提供（含分群条件摘要等自定义渲染）。
 * Schema 字段仅描述新建分群所需表单字段。
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const customerSegmentationSchema: EntitySchema = {
  entity: 'crm_customer_segmentation',
  title: i18n.t('shared.customer_segmentation.k0'),
  description: i18n.t('shared.customer_segmentation.k1'),

  api: {
    module: 'crm',
    resource: 'customerSegmentation',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('shared.customer_segmentation.k2'),
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'description',
      label: i18n.t('shared.customer_segmentation.k3'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'criteria',
      label: i18n.t('shared.customer_segmentation.json_4'),
      type: 'textarea',
      required: true,
      placeholder: i18n.t('shared.customer_segmentation.k9'),
      showInList: false,
    },
  ],

  list: {
    pageSize: 20,
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.customer_segmentation.k5'),
      fields: ['name', 'description'],
    },
    {
      title: i18n.t('shared.customer_segmentation.k6'),
      fields: ['criteria'],
    },
  ],

  formColCount: 1,
  createTitle: i18n.t('shared.customer_segmentation.k7'),
  detailTitle: i18n.t('shared.customer_segmentation.k8'),
};
