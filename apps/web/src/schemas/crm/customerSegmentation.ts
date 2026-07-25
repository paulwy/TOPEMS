/**
 * 客户分群 Schema — 驱动 CRMCustomerSegmentationPage 的列表与新建分群表单
 *
 * 列表展示由页面的 customColumns 提供（含分群条件摘要等自定义渲染）。
 * Schema 字段仅描述新建分群所需表单字段。
 */

import type { EntitySchema } from '@/schema';

export const customerSegmentationSchema: EntitySchema = {
  entity: 'crm_customer_segmentation',
  title: '客户分群',
  description: '基于多维度条件对客户进行精细化分群运营',

  api: {
    module: 'crm',
    resource: 'customerSegmentation',
  },

  fields: [
    {
      name: 'name',
      label: '分群名称',
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'description',
      label: '分群描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'criteria',
      label: '分群条件 (JSON)',
      type: 'textarea',
      required: true,
      placeholder: '例如：{"industries":["manufacturing"],"score_min":60,"statuses":["active"]}',
      showInList: false,
    },
  ],

  list: {
    pageSize: 20,
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'description'],
    },
    {
      title: '分群条件',
      fields: ['criteria'],
    },
  ],

  formColCount: 1,
  createTitle: '新建分群',
  detailTitle: '分群详情',
};
