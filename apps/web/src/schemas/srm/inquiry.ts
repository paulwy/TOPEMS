import React from 'react';
import type { EntitySchema } from '@/schema';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'primary' },
  in_progress: { label: '报价中', color: 'warning' },
  closed: { label: '已关闭', color: 'default' },
  awarded: { label: '已授标', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

const urgencyConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  low: { label: '低', color: 'default' },
  normal: { label: '普通', color: 'primary' },
  high: { label: '紧急', color: 'warning' },
  urgent: { label: '特急', color: 'error' },
};

export const inquirySchema: EntitySchema = {
  entity: 'srm_inquiry',
  title: '询报价管理',
  description: '管理采购询价与供应商报价流程',

  api: {
    module: 'srm',
    resource: 'inquiries',
  },

  fields: [
    {
      name: 'inquiry_no',
      label: '询价单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'title',
      label: '标题',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category',
      label: '询价类别',
      type: 'select',
      required: true,
      defaultValue: 'raw_material',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: '原材料' },
          { value: 'component', label: '零部件' },
          { value: 'equipment', label: '设备' },
          { value: 'service', label: '服务' },
          { value: 'packaging', label: '包装材料' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'urgency',
      label: '紧急程度',
      type: 'select',
      required: true,
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: '低' },
          { value: 'normal', label: '普通' },
          { value: 'high', label: '紧急' },
          { value: 'urgent', label: '特急' },
        ],
      },
      listWidth: 90,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'published', label: '已发布' },
          { value: 'in_progress', label: '报价中' },
          { value: 'closed', label: '已关闭' },
          { value: 'awarded', label: '已授标' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'quotation_count',
      label: '报价数',
      type: 'number',
      readonly: true,
      hideInForm: true,
      listWidth: 80,
    },
    {
      name: 'creator',
      label: '创建人',
      type: 'text',
      readonly: true,
      hideInForm: true,
      listWidth: 100,
    },
    {
      name: 'deadline',
      label: '截止日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'inquiry_no',
      'title',
      'category',
      'urgency',
      'status',
      'quotation_count',
      'creator',
      'deadline',
    ],
    searchFields: ['inquiry_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: Object.fromEntries(Object.entries(statusConfig).map(([k, v]) => [k, v.color])),
      labelMap: Object.fromEntries(Object.entries(statusConfig).map(([k, v]) => [k, v.label])),
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          ...Object.entries(statusConfig).map(([k, v]) => ({ label: v.label, value: k })),
        ],
      },
      {
        id: 'urgency',
        label: '紧急程度',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          ...Object.entries(urgencyConfig).map(([k, v]) => ({ label: v.label, value: k })),
        ],
      },
      {
        id: 'category',
        label: '询价类别',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '原材料', value: 'raw_material' },
          { label: '零部件', value: 'component' },
          { label: '设备', value: 'equipment' },
          { label: '服务', value: 'service' },
          { label: '包装材料', value: 'packaging' },
          { label: '其他', value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['inquiry_no', 'title', 'category', 'urgency'],
    },
    {
      title: '日期与状态',
      fields: ['deadline', 'status'],
    },
    {
      title: '描述与备注',
      fields: ['description', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新增询价单',
  editTitle: '编辑询价单',
  detailTitle: '询价单详情',
};
