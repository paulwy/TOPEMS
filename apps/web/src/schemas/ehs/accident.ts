import React from 'react';
import type { EntitySchema } from '@/schema';

export const accidentSchema: EntitySchema = {
  entity: 'ehsAccident',
  title: '事故管理',
  description: '管理企业事故信息，包括事故类别、级别、损失、状态等',

  api: {
    module: 'ehs',
    resource: 'accidents',
  },

  fields: [
    {
      name: 'accident_no',
      label: '事故编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'title',
      label: '事故标题',
      type: 'text',
      required: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'category',
      label: '事故类别',
      type: 'select',
      required: true,
      defaultValue: 'safety',
      options: {
        type: 'static',
        options: [
          { value: 'safety', label: '安全事故' },
          { value: 'environment', label: '环境事故' },
          { value: 'health', label: '健康事故' },
          { value: 'property', label: '财产事故' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'level',
      label: '事故级别',
      type: 'select',
      required: true,
      defaultValue: '一般',
      options: {
        type: 'static',
        options: [
          { value: '一般', label: '一般' },
          { value: '较大', label: '较大' },
          { value: '重大', label: '重大' },
          { value: '特别重大', label: '特别重大' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'location',
      label: '事故地点',
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'department_id',
      label: '所属部门',
      type: 'text',
      showInList: false,
    },
    {
      name: 'casualties',
      label: '伤亡人数',
      type: 'number',
      showInList: false,
    },
    {
      name: 'direct_loss',
      label: '直接损失',
      type: 'number',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement(
          'span',
          { style: { fontWeight: 'medium' } },
          `¥${(row.direct_loss || 0).toLocaleString()}`
        );
      },
    },
    {
      name: 'accident_date',
      label: '事故日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '调查中',
      options: {
        type: 'static',
        options: [
          { value: '调查中', label: '调查中' },
          { value: '处理中', label: '处理中' },
          { value: '已结案', label: '已结案' },
          { value: '已归档', label: '已归档' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['accident_no', 'title', 'category', 'level', 'location', 'accident_date', 'status'],
    searchFields: ['accident_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        调查中: 'warning',
        处理中: 'primary',
        已结案: 'success',
        已归档: 'default',
      },
      labelMap: {
        调查中: '调查中',
        处理中: '处理中',
        已结案: '已结案',
        已归档: '已归档',
      },
    },
    filters: [
      {
        id: 'category',
        label: '事故类别',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '安全事故', value: 'safety' },
          { label: '环境事故', value: 'environment' },
          { label: '健康事故', value: 'health' },
          { label: '财产事故', value: 'property' },
        ],
      },
      {
        id: 'level',
        label: '事故级别',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '一般', value: '一般' },
          { label: '较大', value: '较大' },
          { label: '重大', value: '重大' },
          { label: '特别重大', value: '特别重大' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['accident_no', 'title', 'category', 'level'],
    },
    {
      title: '事故地点',
      fields: ['location', 'department_id', 'accident_date'],
    },
    {
      title: '损失与状态',
      fields: ['casualties', 'direct_loss', 'status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建事故',
  editTitle: '编辑事故',
  detailTitle: '事故详情',
};
