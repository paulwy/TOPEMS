import React from 'react';
import type { EntitySchema } from '@/schema';

export const evaluationSchema: EntitySchema = {
  entity: 'evaluation',
  title: '供应商评估',
  description: '供应商绩效评估，包括质量、交付、服务、价格等多维度评分',

  api: {
    module: 'scm',
    resource: 'evaluations',
  },

  fields: [
    {
      name: 'evaluation_no',
      label: '评估编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'supplier_id',
      label: '供应商',
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'evaluation_date',
      label: '评估日期',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'evaluator',
      label: '评估人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'quality_score',
      label: '质量评分',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.quality_score as number | undefined;
        return val != null ? val.toFixed(1) : '-';
      },
    },
    {
      name: 'delivery_score',
      label: '交付评分',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.delivery_score as number | undefined;
        return val != null ? val.toFixed(1) : '-';
      },
    },
    {
      name: 'service_score',
      label: '服务评分',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.service_score as number | undefined;
        return val != null ? val.toFixed(1) : '-';
      },
    },
    {
      name: 'price_score',
      label: '价格评分',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.price_score as number | undefined;
        return val != null ? val.toFixed(1) : '-';
      },
    },
    {
      name: 'overall_score',
      label: '综合评分',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.overall_score as number | undefined;
        const style: React.CSSProperties = { fontWeight: 600 };
        return React.createElement('span', { style }, val != null ? val.toFixed(1) : '-');
      },
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
          { value: 'submitted', label: '已提交' },
          { value: 'approved', label: '已批准' },
          { value: 'completed', label: '已完成' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'comments',
      label: '评语',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'evaluation_no',
      'supplier_id',
      'evaluation_date',
      'quality_score',
      'delivery_score',
      'service_score',
      'price_score',
      'overall_score',
      'evaluator',
      'status',
    ],
    searchFields: ['evaluation_no', 'supplier_id', 'evaluator'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        submitted: 'warning',
        approved: 'info',
        completed: 'success',
      },
      labelMap: {
        draft: '草稿',
        submitted: '已提交',
        approved: '已批准',
        completed: '已完成',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已提交', value: 'submitted' },
          { label: '已批准', value: 'approved' },
          { label: '已完成', value: 'completed' },
        ],
      },
      {
        id: 'supplier_id',
        label: '供应商',
        type: 'select',
        options: [],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['evaluation_no', 'supplier_id', 'evaluation_date', 'evaluator', 'status'],
    },
    {
      title: '评分详情',
      fields: [
        'quality_score',
        'delivery_score',
        'service_score',
        'price_score',
        'overall_score',
      ],
    },
    {
      title: '评语',
      fields: ['comments'],
    },
  ],

  formColCount: 2,
  createTitle: '新增评估记录',
  editTitle: '编辑评估记录',
  detailTitle: '评估详情',
};